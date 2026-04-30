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
      mint_authority_not_renounced: z.boolean(),
      freeze_authority_not_renounced: z.boolean(),
      metadata_mutable: z.boolean(),
      bonded_pct_below: z.number(),
      top10_holders_pct_above: z.number(),
      min_liquidity_sol: z.number(),
      first60s_unique_buyers_below: z.number(),
      dev_self_bought: z.boolean(),
    }),
  }),
  sources: z.object({
    pumpfun: z.boolean(),
    raydium_launchpad: z.boolean(),
    raydium_amm: z.boolean(),
    geyser: z.boolean(),
  }),
  ai: z.object({
    enabled: z.boolean(),
    prompt_cache: z.boolean(),
  }),
  output: z.object({
    stdout: z.boolean(),
    jsonl_path: z.string().nullable().optional(),
    webhook_url: z.string().nullable().optional(),
    webhook_min_verdict: z.enum(["alert", "watch", "ignore"]).default("watch"),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

export interface Env {
  rpcUrl: string;
  wsUrl: string;
  geyserGrpcUrl: string;
  heliusApiKey: string;
  jitoBlockEngineUrl: string;
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
    rpcUrl: process.env.SOL_RPC_URL ?? "",
    wsUrl: process.env.SOL_WS_URL ?? "",
    geyserGrpcUrl: process.env.SOL_GEYSER_GRPC_URL ?? "",
    heliusApiKey: process.env.HELIUS_API_KEY ?? "",
    jitoBlockEngineUrl:
      process.env.JITO_BLOCK_ENGINE_URL ?? "https://mainnet.block-engine.jito.wtf",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
    anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
    logLevel: process.env.LOG_LEVEL ?? "info",
  };
}

export function assertEnv(env: Env, config: Config): void {
  const missing: string[] = [];
  if (!env.rpcUrl) missing.push("SOL_RPC_URL");
  if (config.sources.geyser && !env.geyserGrpcUrl) {
    missing.push("SOL_GEYSER_GRPC_URL (required for geyser source)");
  }
  if (config.ai.enabled && !env.anthropicApiKey) {
    missing.push("ANTHROPIC_API_KEY (ai.enabled=true)");
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars: ${missing.join(", ")}. ` +
        `Copy .env.example to .env and fill them in.`,
    );
  }
}
// haiku 4.5 is enough for verdicts
// fails fast on missing rpc
