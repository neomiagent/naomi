import type { Logger } from "pino";
import type { Env } from "../config.js";
import type { TokenEvent } from "../types.js";

export interface BundleStats {
  buyersCount: number;
  buyersPct: number;
  suspectedBundle: boolean;
}

/**
 * Detect launch bundles — multiple wallets buying in the same block / same tx,
 * usually controlled by the deployer to fake organic interest.
 *
 * Strategy:
 *   - pull the first N transactions of the pool
 *   - cluster buyers by funding source (often funded from same wallet just before)
 *   - if cluster covers >X% of supply within first slot, it's a bundle
 *
 * See ~/.claude/skills/pump-bundle-analyzer if you want a richer analyzer.
 */
export async function detectBundle(
  event: TokenEvent,
  env: Env,
  logger: Logger,
): Promise<BundleStats> {
  if (!env.rpcUrl) {
    logger.debug({ pool: event.pool }, "no rpc, skipping bundle detection");
    return { buyersCount: 0, buyersPct: 0, suspectedBundle: false };
  }

  // TODO: implement bundle clustering against env.rpcUrl.
  return { buyersCount: 0, buyersPct: 0, suspectedBundle: false };
}
