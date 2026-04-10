import type { Logger } from "pino";
import type { Env } from "../config.js";
import type { TokenEvent } from "../types.js";

export type EventHandler = (ev: TokenEvent) => Promise<void> | void;

// mempool source watches pending transactions for `addLiquidityETH` and direct
// pair-creation calls before they confirm. Useful for catching deploys that
// add liquidity in the same block they create the pair, where the v2/v3 log
// listener fires only after inclusion.
//
// This is a stub. Real implementations need a provider that exposes
// alchemy_pendingTransactions, eth_subscribe newPendingTransactions with full
// tx body, or a private mempool feed (bloXroute, blocknative). Public WS is
// rarely enough.
export function startMempoolListener(
  env: Env,
  logger: Logger,
  _onEvent: EventHandler,
): () => void {
  if (!env.wsUrl) {
    logger.warn("mempool listener disabled: ETH_WS_URL not set");
    return () => {};
  }

  // TODO: wire alchemy_pendingTransactions filter on uniswap router addresses,
  // decode addLiquidityETH calldata, emit TokenEvent with source: "mempool".
  logger.info({ source: "mempool" }, "mempool listener stub started (no events emitted)");

  return () => {
    logger.debug("mempool listener stopped");
  };
}
// needs alchemy_pendingTransactions or eth_subscribe
// filter: addLiquidityETH and addLiquidity
