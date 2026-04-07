import type { Logger } from "pino";
import type { Env } from "../config.js";
import type { TokenEvent } from "../types.js";

/**
 * Raydium / Meteora migration listener.
 *
 * Watches for new pool initialization on Raydium AMM/CLMM and Meteora DLMM.
 * Many memecoins migrate from pump.fun bonding curve to Raydium when the
 * curve completes — those migrations are a second snipe window.
 *
 * Plug in your transport below.
 */
export async function startRaydiumListener(
  env: Env,
  onEvent: (event: TokenEvent) => Promise<void> | void,
  logger: Logger,
): Promise<void> {
  const log = logger.child({ listener: "raydium" });

  if (!env.geyserUrl && !env.wsUrl) {
    log.warn("no transport configured — raydium listener idle");
    return;
  }

  log.info("raydium listener started (stub) — implement transport here");

  // TODO: subscribe to Raydium AMM/CLMM program logs, decode initialize_pool,
  // emit TokenEvent.

  void onEvent;
}
