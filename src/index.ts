#!/usr/bin/env node
import pino from "pino";
import { loadConfig, loadEnv, assertEnv, type Config, type Env } from "./config.js";
import type { AnalyzedToken, TokenEvent } from "./types.js";
import { startUniswapV2Listener } from "./listener/uniswap_v2.js";
import { startUniswapV3Listener } from "./listener/uniswap_v3.js";
import { startMempoolListener } from "./listener/mempool.js";
import { enrich } from "./enricher/index.js";
import { runFilter } from "./ai/filter.js";
import { emitStdout } from "./output/stdout.js";
import { emitJsonl } from "./output/jsonl.js";
import { emitWebhook } from "./output/webhook.js";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : { target: "pino-pretty", options: { colorize: true } },
});

async function main() {
  const env = loadEnv();
  const config = loadConfig();
  assertEnv(env, config);

  logger.info(
    {
      ai: config.ai.enabled,
      sources: config.sources,
      output: { stdout: config.output.stdout, jsonl: !!config.output.jsonl_path, webhook: !!config.output.webhook_url },
    },
    "naomi analyzer starting",
  );

  const handle = makeHandler(env, config);
  const stops: Array<() => void> = [];

  if (config.sources.uniswap_v2) stops.push(startUniswapV2Listener(env, logger, handle));
  if (config.sources.uniswap_v3) stops.push(startUniswapV3Listener(env, logger, handle));
  if (config.sources.mempool) stops.push(startMempoolListener(env, logger, handle));

  const shutdown = () => {
    logger.info("shutdown signal received, stopping listeners");
    for (const stop of stops) stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function makeHandler(env: Env, config: Config) {
  return async (ev: TokenEvent) => {
    try {
      const enriched = await enrich(ev, env, logger);
      const decision = await runFilter(enriched, env, config, logger);
      const analyzed: AnalyzedToken = {
        ...enriched,
        decision,
        analyzedAt: Date.now(),
      };

      if (decision.score < config.filter.min_score && decision.verdict === "ignore") {
        logger.debug({ token: ev.token, score: decision.score }, "below min_score, dropping");
        return;
      }

      await Promise.all([
        config.output.stdout ? Promise.resolve(emitStdout(analyzed, logger)) : null,
        config.output.jsonl_path ? emitJsonl(config.output.jsonl_path, analyzed, logger) : null,
        config.output.webhook_url
          ? emitWebhook(
              config.output.webhook_url,
              config.output.webhook_min_verdict,
              analyzed,
              logger,
            )
          : null,
      ]);
    } catch (err) {
      logger.error({ err, token: ev.token }, "pipeline failed for token");
    }
  };
}

main().catch((err) => {
  logger.fatal({ err }, "naomi crashed");
  process.exit(1);
});
// drain in pipeline order
