import type { Logger } from "pino";
import type { Env } from "../config.js";

// concentration is computed excluding the curve/lp account
export interface HolderStats {
  uniqueHolders: number;
  top10Pct: number;
  mintAuthorityActive: boolean;
  freezeAuthorityActive: boolean;
  lpBurned: boolean;
}

/**
 * Fetch holder concentration and authority flags for a mint.
 *
 * Uses RPC `getTokenLargestAccounts` + `getAccountInfo` on the mint.
 * Implement against the RPC URL in env.rpcUrl.
 */
export async function fetchHolderStats(
  mint: string,
  env: Env,
  logger: Logger,
): Promise<HolderStats> {
  if (!env.rpcUrl) {
    logger.debug({ mint }, "no rpc url, returning placeholder holder stats");
    return placeholder();
  }

  // TODO: implement using @solana/web3.js Connection.
  // const conn = new Connection(env.rpcUrl, "confirmed");
  // const largest = await conn.getTokenLargestAccounts(new PublicKey(mint));
  // const supply = await conn.getTokenSupply(new PublicKey(mint));
  // const mintInfo = await getMint(conn, new PublicKey(mint));

  return placeholder();
}

function placeholder(): HolderStats {
  return {
    uniqueHolders: 0,
    top10Pct: 0,
    mintAuthorityActive: false,
    freezeAuthorityActive: false,
    lpBurned: false,
  };
}
