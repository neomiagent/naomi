import type { Logger } from "pino";
import type { Config, Env } from "../config.js";
import type { EnrichedToken } from "../types.js";
import { sendJitoBundle } from "./jito.js";

export interface BuyResult {
  ok: boolean;
  signature?: string;
  amountTokens?: number;
  amountSolSpent?: number;
  error?: string;
}

/**
 * Build and submit the buy transaction.
 *
 * For pump.fun tokens still on the bonding curve, you call the pump.fun
 * `buy` instruction directly. For Raydium pools, swap via Raydium router
 * (or aggregator like Jupiter). The result is bundled with a Jito tip
 * for landing priority.
 */
export async function executeBuy(
  token: EnrichedToken,
  config: Config,
  env: Env,
  logger: Logger,
): Promise<BuyResult> {
  if (env.mode !== "live") {
    return { ok: false, error: "not in live mode" };
  }

  if (!env.walletPrivateKey || !env.jitoUrl) {
    return { ok: false, error: "wallet or jito not configured" };
  }

  // TODO: implement.
  // 1. Build buy instruction (pump.fun or raydium-swap depending on token.source).
  // 2. Add compute budget + priority fee.
  // 3. Add Jito tip transfer instruction.
  // 4. Sign with wallet.
  // 5. Submit via sendJitoBundle.
  //
  // const tx = await buildBuyTx(...)
  // const signature = await sendJitoBundle([tx], env.jitoUrl);

  logger.warn({ mint: token.mint }, "executeBuy is a stub — implement before live trading");
  void config;
  return { ok: false, error: "executor not implemented yet, see TODO" };
}
