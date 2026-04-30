import type { Logger } from "pino";
import type { HolderStats, Pubkey } from "../types.js";
import type { Env } from "../config.js";

// holder concentration stats. uses helius getTokenAccounts (or similar) to
// list token-account holders, then computes top-10 share + first-slot count.
//
// stub. v0.3 wires the real helius call. for now we return zeros + notes.

export async function checkHolders(
  mint: Pubkey,
  _deployer: Pubkey,
  env: Env,
  logger: Logger,
): Promise<HolderStats> {
  if (!env.heliusApiKey || mint === "stub") {
    return {
      total: 0,
      top10ConcentrationPct: 0,
      firstSlotHolders: 0,
      notes: ["skipped:no_helius_key_or_stub"],
    };
  }

  // TODO(senri): wire helius getTokenAccounts. expected response shape is
  // a paginated list of {address, owner, amount}. compute top-10 concentration
  // by amount and first-slot count by querying the first-slot signatures.
  logger.debug({ mint }, "holders stub");

  return {
    total: 0,
    top10ConcentrationPct: 0,
    firstSlotHolders: 0,
    notes: ["holders:not_yet_fetched"],
  };
}
// helius tokens api: GET /v0/token-accounts?mint=<mint>
// solscan also offers a holder endpoint as backup
// first-slot holders is the heuristic for sniper-bundle detection
// fixture replay pending
