import type { Logger } from "pino";
import { createPublicClient, http, formatEther, type PublicClient } from "viem";
import { mainnet } from "viem/chains";
import type { Address, LiquidityStats, TokenEvent } from "../types.js";
import type { Env } from "../config.js";

const WETH: Address = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const BURN: Address = "0x000000000000000000000000000000000000dEaD";

// known LP locker contracts; LP tokens sent here are considered locked
const LP_LOCKERS: Address[] = [
  "0x71B5759d73262FBb223956913ecF4ecC51057641", // pinklock v2
  "0x663A5C229c09b049E36dCc11a9B0d4a8Eb9db214", // unicrypt
  "0xE2fE530C047f2d85298b07D9333C05737f1435fB", // team finance
];

export async function checkLiquidity(
  ev: TokenEvent,
  env: Env,
  logger: Logger,
): Promise<LiquidityStats> {
  const stats: LiquidityStats = {
    poolEthValue: 0,
    lpTokenLocked: false,
    lpBurnedPct: 0,
  };

  if (!ev.pair || !env.rpcUrl) return stats;

  const client: PublicClient = createPublicClient({
    chain: mainnet,
    transport: http(env.rpcUrl),
  });

  try {
    const wethBalance = await client.readContract({
      address: WETH,
      abi: [
        {
          type: "function",
          name: "balanceOf",
          inputs: [{ type: "address" }],
          outputs: [{ type: "uint256" }],
          stateMutability: "view",
        },
      ],
      functionName: "balanceOf",
      args: [ev.pair],
    });
    stats.poolEthValue = Number(formatEther(wethBalance));
  } catch (err) {
    logger.debug({ err, pair: ev.pair }, "weth balanceOf failed");
  }

  // for v2 pairs: total supply is LP token supply, balance held by burn or
  // lockers tells us % locked. v3 positions are NFTs and need a different
  // path; this stub treats v3 as untracked.
  if (ev.source === "uniswap_v2") {
    try {
      const [supply, burned, ...lockerHeld] = await Promise.all([
        client.readContract({
          address: ev.pair,
          abi: erc20Abi,
          functionName: "totalSupply",
        }),
        client.readContract({
          address: ev.pair,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [BURN],
        }),
        ...LP_LOCKERS.map((l) =>
          client.readContract({
            address: ev.pair!,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [l],
          }),
        ),
      ]);

      if (supply > 0n) {
        stats.lpBurnedPct = Number((burned * 10000n) / supply) / 100;
        const locked = lockerHeld.reduce((a, b) => a + b, 0n);
        stats.lpTokenLocked = locked > 0n || stats.lpBurnedPct > 95;
      }
    } catch (err) {
      logger.debug({ err, pair: ev.pair }, "lp lock check failed");
    }
  }

  return stats;
}

const erc20Abi = [
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;
// fall back to ignored verdict
