import type { Logger } from "pino";
import type { Env } from "../config.js";
import type { EnrichedToken, TokenEvent } from "../types.js";
import { fetchHolderStats } from "./holders.js";
import { detectBundle } from "./bundle.js";
import { fetchDeployerStats } from "./deployer.js";

export async function enrichToken(
  event: TokenEvent,
  env: Env,
  logger: Logger,
): Promise<EnrichedToken> {
  const [holders, bundle, deployer] = await Promise.all([
    fetchHolderStats(event.mint, env, logger),
    detectBundle(event, env, logger),
    fetchDeployerStats(event.deployer, env, logger),
  ]);

  return {
    ...event,
    features: {
      mintAuthorityActive: holders.mintAuthorityActive,
      freezeAuthorityActive: holders.freezeAuthorityActive,
      lpBurned: holders.lpBurned,
      top10HoldersPct: holders.top10Pct,
      uniqueHolders: holders.uniqueHolders,
      bundleBuyersCount: bundle.buyersCount,
      bundleBuyersPct: bundle.buyersPct,
      deployerStats: deployer,
      socials: {
        hasTwitter: Boolean(event.metadata?.twitter),
        hasTelegram: Boolean(event.metadata?.telegram),
      },
    },
  };
}
