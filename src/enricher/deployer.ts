import type { Logger } from "pino";
import type { Address, DeployerStats } from "../types.js";
import type { Env } from "../config.js";

interface DeployerCache {
  tokensLaunched: number;
  rugCount: number;
  bestMultiplier: number;
}

// In-memory deployer history. For production, swap with sqlite/postgres so
// the analyzer accumulates a long-running view of repeat offenders.
const cache = new Map<Address, DeployerCache>();

interface ContractCreatedTx {
  contractAddress: string;
  txreceipt_status: string;
}

export async function checkDeployer(
  deployer: Address,
  env: Env,
  logger: Logger,
): Promise<DeployerStats> {
  const stats: DeployerStats = {
    address: deployer,
    tokensLaunched: 0,
    rugRatio: 0,
    bestMultiplier: 0,
    knownScammer: false,
  };

  const cached = cache.get(deployer);
  if (cached) {
    stats.tokensLaunched = cached.tokensLaunched;
    stats.rugRatio = cached.tokensLaunched > 0 ? cached.rugCount / cached.tokensLaunched : 0;
    stats.bestMultiplier = cached.bestMultiplier;
    return stats;
  }

  if (!env.etherscanApiKey) return stats;

  // approximate "tokens launched" by counting contract-creation txs from this
  // address. Distinguishing tokens from arbitrary contracts requires checking
  // each result for ERC20 interface; we approximate by count.
  const url =
    `https://api.etherscan.io/api?module=account&action=txlistinternal` +
    `&address=${deployer}&startblock=0&endblock=99999999&page=1&offset=100` +
    `&sort=desc&apikey=${env.etherscanApiKey}`;

  try {
    const res = await fetch(url);
    const data = (await res.json()) as { status: string; result: ContractCreatedTx[] };
    if (data.status !== "1") return stats;

    const created = data.result.filter((t) => t.contractAddress && t.contractAddress !== "");
    stats.tokensLaunched = created.length;
    cache.set(deployer, {
      tokensLaunched: stats.tokensLaunched,
      rugCount: 0,
      bestMultiplier: 0,
    });
  } catch (err) {
    logger.debug({ err, deployer }, "deployer history fetch failed");
  }

  return stats;
}

// Called by output sinks once a token's outcome is known (post-rug or
// post-pump) so the cache learns. Stub for now.
export function recordOutcome(
  deployer: Address,
  outcome: "rug" | "runner",
  multiplier?: number,
): void {
  const entry = cache.get(deployer) ?? {
    tokensLaunched: 0,
    rugCount: 0,
    bestMultiplier: 0,
  };
  if (outcome === "rug") entry.rugCount += 1;
  if (outcome === "runner" && multiplier && multiplier > entry.bestMultiplier) {
    entry.bestMultiplier = multiplier;
  }
  cache.set(deployer, entry);
}
// addresses are case-insensitive
// ratio drives deployer trust score
