import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import "dotenv/config";

const ConfigSchema = z.object({
  risk: z.object({
    per_trade_sol: z.number().positive(),
    max_concurrent: z.number().int().positive(),
    bankroll_cap_sol: z.number().positive(),
  }),
  filter: z.object({
    min_score: z.number().min(0).max(1),
    reject: z.object({
      mint_authority_active: z.boolean(),
      freeze_authority_active: z.boolean(),
      lp_not_burned: z.boolean(),
      top10_holders_pct_above: z.number(),
      bundle_buyers_above: z.number(),
    }),
  }),
  execution: z.object({
    max_slippage_pct: z.number(),
    jito_tip_lamports: z.number().int(),
    priority_fee_microlamports: z.number().int(),
    decision_deadline_ms: z.number().int(),
  }),
  position: z.object({
    tp_ladder: z.array(z.tuple([z.number(), z.number()])),
    stop_loss_pct: z.number(),
    trailing_stop_after_multiplier: z.number(),
    trailing_stop_pct: z.number(),
    dev_sell_exit_pct: z.number(),
  }),
  sources: z.object({
    pumpfun: z.boolean(),
    raydium_migrations: z.boolean(),
    meteora: z.boolean(),
  }),
  ai: z.object({
    enabled: z.boolean(),
    prompt_cache: z.boolean(),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

export interface Env {
  mode: "paper" | "live";
  rpcUrl: string;
  wsUrl: string;
  geyserUrl: string;
  geyserToken: string;
  walletPrivateKey: string;
  jitoUrl: string;
  jitoTipLamports: number;
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
  const mode = (process.env.MODE ?? "paper") as "paper" | "live";
  return {
    mode,
    rpcUrl: process.env.SOLANA_RPC_URL ?? "",
    wsUrl: process.env.SOLANA_WS_URL ?? "",
    geyserUrl: process.env.GEYSER_GRPC_URL ?? "",
    geyserToken: process.env.GEYSER_TOKEN ?? "",
    walletPrivateKey: process.env.WALLET_PRIVATE_KEY ?? "",
    jitoUrl: process.env.JITO_BLOCK_ENGINE_URL ?? "",
    jitoTipLamports: Number(process.env.JITO_TIP_LAMPORTS ?? 100000),
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
    anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
    logLevel: process.env.LOG_LEVEL ?? "info",
  };
}

export function assertLiveEnv(env: Env): void {
  const missing: string[] = [];
  if (!env.rpcUrl) missing.push("SOLANA_RPC_URL");
  if (!env.walletPrivateKey) missing.push("WALLET_PRIVATE_KEY");
  if (!env.jitoUrl) missing.push("JITO_BLOCK_ENGINE_URL");
  if (!env.anthropicApiKey) missing.push("ANTHROPIC_API_KEY");
  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars for live mode: ${missing.join(", ")}. ` +
        `Copy .env.example to .env and fill them in.`,
    );
  }
}
