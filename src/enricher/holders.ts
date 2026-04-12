import type { Logger } from "pino";
import type { Address, HolderStats } from "../types.js";
import type { Env } from "../config.js";

interface TokenHoldersResponse {
  status: string;
  result: Array<{ TokenHolderAddress: string; TokenHolderQuantity: string }>;
}

// Etherscan PRO endpoint tokenholderlist is the cleanest source for holder
// distribution. Free-tier keys do NOT have access; the call returns NOTOK.
// In that case we degrade to "unknown" stats so downstream filters can
// abstain on this signal rather than reject everything.
export async function checkHolders(
  token: Address,
  deployer: Address,
  env: Env,
  logger: Logger,
): Promise<HolderStats> {
  const stats: HolderStats = {
    uniqueHolders: 0,
    top10Pct: 0,
    deployerHoldsPct: 0,
  };

  if (!env.etherscanApiKey) return stats;

  const url =
    `https://api.etherscan.io/api?module=token&action=tokenholderlist` +
    `&contractaddress=${token}&page=1&offset=100&apikey=${env.etherscanApiKey}`;

  try {
    const res = await fetch(url);
    const data = (await res.json()) as TokenHoldersResponse;
    if (data.status !== "1" || !Array.isArray(data.result)) return stats;

    stats.uniqueHolders = data.result.length;
    const total = data.result.reduce(
      (sum, h) => sum + BigInt(h.TokenHolderQuantity),
      0n,
    );
    if (total === 0n) return stats;

    const top10 = data.result
      .slice(0, 10)
      .reduce((sum, h) => sum + BigInt(h.TokenHolderQuantity), 0n);
    stats.top10Pct = Number((top10 * 10000n) / total) / 100;

    const dep = data.result.find(
      (h) => h.TokenHolderAddress.toLowerCase() === deployer.toLowerCase(),
    );
    if (dep) {
      stats.deployerHoldsPct =
        Number((BigInt(dep.TokenHolderQuantity) * 10000n) / total) / 100;
    }
  } catch (err) {
    logger.debug({ err, token }, "tokenholderlist fetch failed");
  }

  return stats;
}
// no holders endpoint on free tier
// top10 used by score formula too
