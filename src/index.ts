import pino from "pino";
import { loadConfig, loadEnv, assertLiveEnv } from "./config.js";
import { startPumpfunListener } from "./listener/pumpfun.js";
import { startRaydiumListener } from "./listener/raydium.js";
import { enrichToken } from "./enricher/index.js";
import { runFilter } from "./ai/filter.js";
import { executeBuy } from "./executor/buy.js";
import { PositionManager } from "./position/manager.js";
import type { TokenEvent } from "./types.js";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport: { target: "pino-pretty", options: { colorize: true } },
});

async function main() {
  const env = loadEnv();
  const config = loadConfig();

  logger.info({ mode: env.mode }, "naomi starting");

  if (env.mode === "live") {
    assertLiveEnv(env);
  } else {
    logger.warn("running in PAPER mode — no real trades will be placed");
  }

  const positions = new PositionManager(config, env, logger);
  await positions.start();

  const onEvent = async (event: TokenEvent) => {
    const log = logger.child({ mint: event.mint, source: event.source });
    log.info("new token detected");

    try {
      const enriched = await enrichToken(event, env, log);

      if (!passesHardFilters(enriched, config)) {
        log.info("rejected by hard filters");
        return;
      }

      const decision = config.ai.enabled
        ? await runFilter(enriched, env, config, log)
        : { action: "snipe" as const, score: 1, reason: "ai disabled" };

      log.info({ decision }, "filter decision");

      if (decision.action !== "snipe" || decision.score < config.filter.min_score) {
        return;
      }

      if (positions.openCount() >= config.risk.max_concurrent) {
        log.warn("max concurrent positions reached, skip");
        return;
      }

      if (env.mode === "paper") {
        log.info({ score: decision.score }, "PAPER snipe (no tx sent)");
        positions.openPaper(enriched, config.risk.per_trade_sol);
        return;
      }

      const result = await executeBuy(enriched, config, env, log);
      if (result.ok) {
        positions.open(enriched, result);
      }
    } catch (err) {
      log.error({ err }, "pipeline failure");
    }
  };

  if (config.sources.pumpfun) await startPumpfunListener(env, onEvent, logger);
  if (config.sources.raydium_migrations) await startRaydiumListener(env, onEvent, logger);

  process.on("SIGINT", async () => {
    logger.info("shutting down");
    await positions.stop();
    process.exit(0);
  });
}

function passesHardFilters(token: import("./types.js").EnrichedToken, cfg: ReturnType<typeof loadConfig>) {
  const f = token.features;
  const r = cfg.filter.reject;
  if (r.mint_authority_active && f.mintAuthorityActive) return false;
  if (r.freeze_authority_active && f.freezeAuthorityActive) return false;
  if (r.lp_not_burned && !f.lpBurned) return false;
  if (f.top10HoldersPct > r.top10_holders_pct_above) return false;
  if (f.bundleBuyersCount > r.bundle_buyers_above) return false;
  if (f.deployerStats.knownScammer) return false;
  return true;
}

main().catch((err) => {
  logger.fatal({ err }, "fatal");
  process.exit(1);
});
