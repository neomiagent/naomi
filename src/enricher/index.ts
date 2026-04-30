import type { Logger } from "pino";
import type { EnrichedToken, TokenEvent } from "../types.js";
import type { Env } from "../config.js";
import { checkMintAuthority } from "./mint_authority.js";
import { checkMintMeta } from "./mint_meta.js";
import { checkLiquidity } from "./liquidity.js";
import { checkHolders } from "./holders.js";
import { checkDeployer } from "./deployer.js";
import { checkSocials } from "./socials.js";
import { snapshotFirst60s } from "./first_60s.js";

export async function enrich(
  ev: TokenEvent,
  env: Env,
  logger: Logger,
): Promise<EnrichedToken> {
  const [mintAuthority, mintMeta, liquidity, holders, deployer, first60s] = await Promise.all([
    checkMintAuthority(ev, env, logger),
    checkMintMeta(ev.mint, env, logger),
    checkLiquidity(ev, env, logger),
    checkHolders(ev.mint, ev.deployer, env, logger),
    checkDeployer(ev.deployer, env, logger),
    snapshotFirst60s(ev, env, logger),
  ]);

  const socials = checkSocials(ev);

  return {
    ...ev,
    initialLiquiditySol: liquidity.poolSolValue,
    features: {
      mintAuthority,
      mintMeta,
      liquidity,
      holders,
      deployer,
      socials,
      first60s,
    },
  };
}
// one bad feature shouldn't drop whole token
// happy path, baseline pass
// first_60s is the load-bearing scope tweak over old-naomi
