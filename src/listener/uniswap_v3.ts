import type { Logger } from "pino";
import {
  createPublicClient,
  webSocket,
  http,
  parseAbiItem,
  type PublicClient,
  type Log,
} from "viem";
import { mainnet } from "viem/chains";
import type { Address, TokenEvent } from "../types.js";
import type { Env } from "../config.js";

const FACTORY_V3: Address = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const WETH: Address = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

const POOL_CREATED = parseAbiItem(
  "event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)",
);

export type EventHandler = (ev: TokenEvent) => Promise<void> | void;

export function startUniswapV3Listener(
  env: Env,
  logger: Logger,
  onEvent: EventHandler,
): () => void {
  const transport = env.wsUrl ? webSocket(env.wsUrl) : http(env.rpcUrl);
  const client: PublicClient = createPublicClient({ chain: mainnet, transport });

  logger.info({ source: "uniswap_v3" }, "subscribing to PoolCreated");

  const unwatch = client.watchEvent({
    address: FACTORY_V3,
    event: POOL_CREATED,
    onLogs: (logs: Log[]) => {
      for (const log of logs) {
        handlePoolLog(client, log, logger, onEvent).catch((err) => {
          logger.error({ err }, "uniswap_v3 handler failed");
        });
      }
    },
    onError: (err: Error) => logger.error({ err }, "uniswap_v3 watch error"),
  } as Parameters<typeof client.watchEvent>[0]);

  return unwatch;
}

async function handlePoolLog(
  client: PublicClient,
  log: Log,
  logger: Logger,
  onEvent: EventHandler,
): Promise<void> {
  const args = (log as unknown as {
    args: { token0: Address; token1: Address; fee: number; pool: Address };
  }).args;
  if (!args) return;

  const { token0, token1, pool } = args;
  const token = pickToken(token0, token1);
  if (!token) return;

  const tx = await client.getTransaction({ hash: log.transactionHash! });
  const ev: TokenEvent = {
    chain: "ethereum",
    source: "uniswap_v3",
    token,
    pair: pool,
    deployer: tx.from,
    blockNumber: log.blockNumber!,
    initialLiquidityEth: 0,
    detectedAt: Date.now(),
    txHash: log.transactionHash!,
  };

  logger.debug({ token, pool, fee: args.fee }, "uniswap_v3 pool created");
  await onEvent(ev);
}

function pickToken(token0: Address, token1: Address): Address | null {
  if (token0.toLowerCase() === WETH.toLowerCase()) return token1;
  if (token1.toLowerCase() === WETH.toLowerCase()) return token0;
  return null;
}
// fee tiers normalized lo→hi
