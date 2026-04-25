#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pino from "pino";
import { loadConfig, loadEnv, assertEnv, type Config, type Env } from "./config.js";
import type { AnalyzedToken, TokenEvent, Address } from "./types.js";
import { startUniswapV2Listener } from "./listener/uniswap_v2.js";
import { startUniswapV3Listener } from "./listener/uniswap_v3.js";
import { startMempoolListener } from "./listener/mempool.js";
import { enrich } from "./enricher/index.js";
import { runFilter } from "./ai/filter.js";
import { emitStdout } from "./output/stdout.js";
import { emitJsonl } from "./output/jsonl.js";
import { emitWebhook } from "./output/webhook.js";
import { scanOne } from "./scan.js";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : { target: "pino-pretty", options: { colorize: true } },
});

const HELP = `Usage: naomi [options] [command]

autonomous agent scanner on ethereum — scans token launches for trap risk

Options:
  -V, --version            output the version number
  -h, --help               display help for command

Commands:
  scan [options] <token>   audit a single ethereum token for launch risk
  watch                    listen for new launches and stream verdicts (default)
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
    const token = argv[1];
    if (!token || !token.startsWith("0x")) {
      process.stderr.write("usage: naomi scan <0x-address>\n");
      process.exit(1);
    }
    const env = loadEnv();
    const config = loadConfig();
    assertEnv(env, config);
    await scanOne(token as Address, env, config, logger);
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

dispatch().catch((err) => {
  logger.fatal({ err }, "naomi crashed");
  process.exit(1);
});
