import type { Logger } from "pino";
import type { DeployerStats, Pubkey } from "../types.js";
import type { Env } from "../config.js";

// deployer history. on solana the "deployer" is the fee payer of the
// create transaction. we ask: how many other tokens has this pubkey
// deployed before, and how old is the wallet?
//
// stub. v0.3 wires helius enriched-tx api or rpc getSignaturesForAddress.

export async function checkDeployer(
  pubkey: Pubkey,
  env: Env,
  logger: Logger,
): Promise<DeployerStats> {
  if (!env.rpcUrl || pubkey === "stub") {
    return {
      pubkey,
      priorTokensDeployed: 0,
      ageDays: 0,
      solBalanceAtCreate: 0,
      notes: ["skipped:no_rpc_or_stub"],
    };
  }

  // TODO(senri): use helius enhanced-tx parsed=true to find prior token
  // creations from this pubkey. fall back to getSignaturesForAddress
  // and inspect each tx for spl-token initializeMint instructions.
  logger.debug({ pubkey }, "deployer stub");

  return {
    pubkey,
    priorTokensDeployed: 0,
    ageDays: 0,
    solBalanceAtCreate: 0,
    notes: ["deployer:not_yet_fetched"],
  };
}
// pubkey age is approximated by oldest signature involving the pubkey
// solana wallets are funded by transfers, not eth-style nonce
// prior_tokens_deployed >5 in <30 days is a strong red flag
// fixture replay pending
