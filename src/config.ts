import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import "dotenv/config";

const ConfigSchema = z.object({
  filter: z.object({
    min_score: z.number().min(0).max(1),
    alert_score: z.number().min(0).max(1),
    reject: z.object({
      honeypot: z.boolean(),
      unverified_contract: z.boolean(),
      mint_function_present: z.boolean(),
      blacklist_function_present: z.boolean(),
      ownership_not_renounced: z.boolean(),
      lp_not_locked: z.boolean(),
      top10_holders_pct_above: z.number(),
      min_liquidity_eth: z.number(),
    }),
  }),
  sources: z.object({
    uniswap_v2: z.boolean(),
    uniswap_v3: z.boolean(),
    mempool: z.boolean(),
  }),
  ai: z.object({
    enabled: z.boolean(),
    prompt_cache: z.boolean(),
  }),
  output: z.object({
    stdout: z.boolean(),
    jsonl_path: z.string().optional(),
    webhook_url: z.string().optional(),
    webhook_min_verdict: z.enum(["alert", "watch", "ignore"]).default("watch"),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

export interface Env {
  rpcUrl: string;
  wsUrl: string;
  etherscanApiKey: string;
  anthropicApiKey: string;
  anthropicModel: string;
  logLevel: string;
}

export function loadConfig(path = "config.yaml"): Config {
  const cfgPath = existsSync(path) ? path : "config.example.yaml";
  const raw = readFileSync(resolve(cfgPath), "utf-8");
  const parsed = parseYaml(raw);
  return ConfigSchema.parse(parsed);
}

export function loadEnv(): Env {
  return {
    rpcUrl: process.env.ETH_RPC_URL ?? "",
    wsUrl: process.env.ETH_WS_URL ?? "",
    etherscanApiKey: process.env.ETHERSCAN_API_KEY ?? "",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
    anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
    logLevel: process.env.LOG_LEVEL ?? "info",
  };
}

export function assertEnv(env: Env, config: Config): void {
  const missing: string[] = [];
  if (!env.rpcUrl) missing.push("ETH_RPC_URL");
  if (config.sources.mempool && !env.wsUrl) missing.push("ETH_WS_URL (required for mempool source)");
  if (config.ai.enabled && !env.anthropicApiKey) missing.push("ANTHROPIC_API_KEY (ai.enabled=true)");
  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars: ${missing.join(", ")}. ` +
        `Copy .env.example to .env and fill them in.`,
    );
  }
}
// haiku 4.5 is enough for verdicts
