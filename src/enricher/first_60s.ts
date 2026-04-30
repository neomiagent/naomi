import type { Logger } from "pino";
import { Connection, PublicKey } from "@solana/web3.js";
import type { First60sSnapshot, Pubkey, TokenEvent } from "../types.js";
import type { Env } from "../config.js";

// the load-bearing scope tweak over old-naomi: a snapshot of the first 60
// seconds after launch.
//
// inputs: the create event (mint + slot + signature).
// process: walk the buys / swaps that hit the bonding curve or pool inside
// the 60s window after the create slot. count distinct buyers, total buys,
// largest buy, jito-tagged buys, sniper pubkeys (first 3 slots), and whether
// the deployer self-bought during the window.
//
// stub. v0.3 wires helius enhanced-tx + jito tip-account check.

const JITO_TIP_ACCOUNTS = new Set([
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
  "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDe9B",
  "ADuUkR4vqLUMWXxW9gh6D6L8pivKeVGvCEAoPmZ9JdfP",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
  "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
]);

const WINDOW_MS = 60_000;
const SNIPER_SLOT_DEPTH = 3;

export async function snapshotFirst60s(
  ev: TokenEvent,
  env: Env,
  logger: Logger,
): Promise<First60sSnapshot> {
  if (!env.rpcUrl || ev.mint === "stub") {
    return {
      uniqueBuyers: 0,
      totalBuys: 0,
      largestBuyLamports: 0n,
      jitoBundledBuys: 0,
      earlySnipers: [],
      devSelfBought: false,
      notes: ["skipped:no_rpc_or_stub"],
    };
  }

  try {
    const connection = new Connection(env.rpcUrl, "confirmed");

    // TODO(senri): fetch all signatures from the bond/pool account in the
    // 60s window after ev.slot, fetch each tx, decode buy ixs, classify each.
    logger.debug({ mint: ev.mint, slot: String(ev.slot) }, "first_60s stub");
    void connection;
    void WINDOW_MS;
    void SNIPER_SLOT_DEPTH;

    return {
      uniqueBuyers: 0,
      totalBuys: 0,
      largestBuyLamports: 0n,
      jitoBundledBuys: 0,
      earlySnipers: [],
      devSelfBought: false,
      notes: ["first_60s:not_yet_fetched"],
    };
  } catch (err) {
    logger.warn({ err, mint: ev.mint }, "first_60s lookup failed");
    return {
      uniqueBuyers: 0,
      totalBuys: 0,
      largestBuyLamports: 0n,
      jitoBundledBuys: 0,
      earlySnipers: [],
      devSelfBought: false,
      notes: ["error:lookup_failed"],
    };
  }
}

export function isJitoTipAccount(pubkey: Pubkey): boolean {
  return JITO_TIP_ACCOUNTS.has(pubkey);
}
// 60s ≈ 150 slots at ~400ms per slot
// SNIPER_SLOT_DEPTH=3 means buyers in the first ~1.2s after create
// jito-bundled buys are the strongest sniper signal
// dev_self_bought = deployer pubkey appears as a buyer (rug warmup pattern)
// fixture replay pending
