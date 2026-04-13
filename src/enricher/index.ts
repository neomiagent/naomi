import type { Logger } from "pino";
import type { EnrichedToken, TokenEvent } from "../types.js";
import type { Env } from "../config.js";
import { checkHoneypot } from "./honeypot.js";
import { checkContract } from "./contract.js";
import { checkLiquidity } from "./liquidity.js";
import { checkHolders } from "./holders.js";
import { checkDeployer } from "./deployer.js";
import { checkSocials } from "./socials.js";

export async function enrich(
  ev: TokenEvent,
  env: Env,
  logger: Logger,
): Promise<EnrichedToken> {
  const [honeypot, contract, liquidity, holders, deployer] = await Promise.all([
    checkHoneypot(ev, env, logger),
    checkContract(ev.token, env, logger),
    checkLiquidity(ev, env, logger),
    checkHolders(ev.token, ev.deployer, env, logger),
    checkDeployer(ev.deployer, env, logger),
  ]);

  const socials = checkSocials(ev);

  return {
    ...ev,
    initialLiquidityEth: liquidity.poolEthValue,
    features: { honeypot, contract, liquidity, holders, deployer, socials },
  };
}
// one bad feature shouldn't drop whole token
