import type { Logger } from "pino";
import type { LiquidityStats, TokenEvent } from "../types.js";
import type { Env } from "../config.js";

// liquidity stats per source.
// pump.fun: bonded-curve sol balance + bondedPct toward graduation (~85 sol).
// raydium-launchpad: launchpad pool reserves.
// raydium amm: post-graduation pool reserves.
//
// stub. v0.3 wires real account-data decoding. for now we expose source +
// the new poolSolValue alias the enricher orchestrator looks at.

export async function checkLiquidity(
  ev: TokenEvent,
  env: Env,
  logger: Logger,
): Promise<LiquidityStats & { poolSolValue: number }> {
  if (!env.rpcUrl || ev.poolOrCurve === null || ev.mint === "stub") {
    return {
      source: ev.source,
      solReserve: 0,
      tokenReserve: 0n,
      bondedPct: null,
      notes: ["skipped:no_rpc_or_stub_event"],
      poolSolValue: 0,
    };
  }

  // TODO(luka): decode bonding-curve struct (pump.fun) or pool struct
  // (raydium amm v4 / launchpad). use BorshAccountsCoder against IDL.
  logger.debug({ pool: ev.poolOrCurve, source: ev.source }, "liquidity stub");

  return {
    source: ev.source,
    solReserve: 0,
    tokenReserve: 0n,
    bondedPct: null,
    notes: ["liquidity:not_yet_decoded"],
    poolSolValue: 0,
  };
}
// pump.fun graduation threshold is around 85 sol
// raydium launchpad uses a similar curve
// post-graduation flow goes raydium-amm-v4
// fixture replay pending
