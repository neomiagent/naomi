import type { Logger } from "pino";
import type { Env } from "../config.js";
import type { DeployerStats } from "../types.js";

/**
 * Look up the deployer's launch history.
 *
 * Approach:
 *   - cache deployer history in local SQLite (or Postgres) keyed by address
 *   - on first sight, pull the deployer's signature history and identify mints
 *     they have created on pump.fun / Raydium
 *   - tag a token as "rug" if liquidity dropped >90% within first 24h
 */
export async function fetchDeployerStats(
  address: string,
  env: Env,
  logger: Logger,
): Promise<DeployerStats> {
  if (!env.rpcUrl) {
    logger.debug({ address }, "no rpc, returning empty deployer stats");
    return empty(address);
  }

  // TODO: implement deployer history lookup + cache.
  return empty(address);
}

function empty(address: string): DeployerStats {
  return {
    address,
    tokensLaunched: 0,
    rugRatio: 0,
    bestMultiplier: 0,
    knownScammer: false,
  };
}
