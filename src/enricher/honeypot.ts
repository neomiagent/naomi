import type { Logger } from "pino";
import { createPublicClient, http, type PublicClient } from "viem";
import { mainnet } from "viem/chains";
import type { Address, HoneypotResult, TokenEvent } from "../types.js";
import type { Env } from "../config.js";

// Honeypot detection works by simulating a small WETH-in / token-out trade,
// then a token-in / WETH-out trade against the same pool, in a single eth_call
// state-override block. If the sell reverts or returns less than expected,
// the contract has anti-sell logic.
//
// Real implementation depends on the router (v2 vs v3) and on overriding the
// caller's WETH balance via state diffs. Below is the orchestration shell;
// the actual simulation is a TODO so the repo stays free of provider-specific
// hacks.
export async function checkHoneypot(
  ev: TokenEvent,
  env: Env,
  logger: Logger,
): Promise<HoneypotResult> {
  if (!env.rpcUrl) {
    return {
      canBuy: false,
      canSell: false,
      buyTaxBps: 0,
      sellTaxBps: 0,
      simulationOk: false,
      reason: "no rpc",
    };
  }

  const client: PublicClient = createPublicClient({
    chain: mainnet,
    transport: http(env.rpcUrl),
  });

  try {
    return await simulateBuySell(client, ev.token, ev.pair, logger);
  } catch (err) {
    logger.warn({ err, token: ev.token }, "honeypot simulation failed");
    return {
      canBuy: false,
      canSell: false,
      buyTaxBps: 0,
      sellTaxBps: 0,
      simulationOk: false,
      reason: "simulation error",
    };
  }
}

async function simulateBuySell(
  _client: PublicClient,
  _token: Address,
  _pair: Address | null,
  _logger: Logger,
): Promise<HoneypotResult> {
  // TODO: build two eth_call state-override traces:
  //   1. swap WETH -> token via router, capture out amount
  //   2. swap that token amount back -> WETH, capture out amount
  // tax = 1 - (final WETH / initial WETH). If sell reverts, canSell=false.
  return {
    canBuy: true,
    canSell: true,
    buyTaxBps: 0,
    sellTaxBps: 0,
    simulationOk: false,
    reason: "stub",
  };
}
