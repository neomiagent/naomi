#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pino from "pino";
import { loadConfig, loadEnv, assertEnv, type Config, type Env } from "./config.js";
import type { AnalyzedToken, Pubkey, TokenEvent } from "./types.js";
import { startPumpfunListener } from "./listener/pumpfun.js";
import { startRaydiumLaunchpadListener } from "./listener/raydium_launchpad.js";
import { startGeyserListener } from "./listener/geyser.js";
import { enrich } from "./enricher/index.js";
import { runFilter } from "./ai/filter.js";
import { emitStdout } from "./output/stdout.js";
import { emitJsonl } from "./output/jsonl.js";
import { emitWebhook } from "./output/webhook.js";
import { scanOne } from "./scan.js";
import { runDemo, DEMO_FIXTURES_BY_MINT } from "./demo.js";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : { target: "pino-pretty", options: { colorize: true } },
});

const HELP = `Usage: naomi [options] [command]

autonomous forensic analyzer on solana — snapshots the first 60 seconds of every token launch

Options:
  -V, --version            output the version number
  -h, --help               display help for command

Commands:
  scan [options] <mint>    audit a single solana mint for launch risk
  watch                    listen for new launches and stream verdicts (default)
  demo                     run three offline fixtures, no rpc or keys required
  help [command]           display help for command
`;

function readVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(resolve(here, "..", "package.json"), "utf-8"));
    return pkg.version as string;
  } catch {
    return "unknown";
  }
}

async function dispatch(): Promise<void> {
  const argv = process.argv.slice(2);
  const head = argv[0];

  if (head === "-V" || head === "--version") {
    process.stdout.write(readVersion() + "\n");
    return;
  }

  if (!head || head === "-h" || head === "--help" || head === "help") {
    process.stdout.write(HELP);
    return;
  }

  if (head === "scan") {
    const mint = argv[1];
    if (!mint || mint.length < 32 || mint.startsWith("0x")) {
      process.stderr.write("usage: naomi scan <base58-mint>\n");
      process.exit(1);
    }
    const env = loadEnv();
    const config = loadConfig();
    // skip env assertion for demo mints — they short-circuit inside scanOne
    // and never touch rpc or ai. lets the screencast work on a fresh clone.
    if (!DEMO_FIXTURES_BY_MINT[mint]) {
      assertEnv(env, config);
    }
    await scanOne(mint as Pubkey, env, config, logger);
    return;
  }

  if (head === "demo") {
    // demo is offline: zero rpc, zero ai, deterministic output.
    // load env+config but skip assertEnv so it works on a fresh clone.
    const env = loadEnv();
    const config = loadConfig();
    await runDemo(env, config, logger);
    return;
  }

  if (head === "watch") {
    await runWatch();
    return;
  }

  // unknown command — show help
  process.stderr.write(HELP);
  process.exit(1);
}

async function runWatch(): Promise<void> {
  const env = loadEnv();
  const config = loadConfig();
  assertEnv(env, config);

  logger.info(
    {
      ai: config.ai.enabled,
      sources: config.sources,
      output: {
        stdout: config.output.stdout,
        jsonl: !!config.output.jsonl_path,
        webhook: !!config.output.webhook_url,
      },
    },
    "naomi analyzer starting",
  );

  const handle = makeHandler(env, config);
  const stops: Array<() => void> = [];

  if (config.sources.pumpfun) stops.push(startPumpfunListener(env, logger, handle));
  if (config.sources.raydium_launchpad) {
    stops.push(startRaydiumLaunchpadListener(env, logger, handle));
  }
  if (config.sources.geyser) stops.push(startGeyserListener(env, logger, handle));

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
        logger.debug({ mint: ev.mint, score: decision.score }, "below min_score, dropping");
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
      logger.error({ err, mint: ev.mint }, "pipeline failed for token");
    }
  };
}

dispatch().catch((err) => {
  logger.fatal({ err }, "naomi crashed");
  process.exit(1);
});
