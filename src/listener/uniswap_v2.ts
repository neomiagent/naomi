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

// uniswap v2 factory
const FACTORY_V2: Address = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const WETH: Address = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

const PAIR_CREATED = parseAbiItem(
  "event PairCreated(address indexed token0, address indexed token1, address pair, uint256)",
);

export type EventHandler = (ev: TokenEvent) => Promise<void> | void;

export function startUniswapV2Listener(
  env: Env,
  logger: Logger,
  onEvent: EventHandler,
): () => void {
  const transport = env.wsUrl ? webSocket(env.wsUrl) : http(env.rpcUrl);
  const client: PublicClient = createPublicClient({ chain: mainnet, transport });

  logger.info({ source: "uniswap_v2" }, "subscribing to PairCreated");

  // viem watchEvent has finicky overload inference around abi-event generics;
  // cast the params object so a literal AbiEvent type doesn't widen to undefined.
  const unwatch = client.watchEvent({
    address: FACTORY_V2,
    event: PAIR_CREATED,
    onLogs: (logs: Log[]) => {
      for (const log of logs) {
        handlePairLog(client, log, logger, onEvent).catch((err) => {
          logger.error({ err }, "uniswap_v2 handler failed");
        });
      }
    },
    onError: (err: Error) => logger.error({ err }, "uniswap_v2 watch error"),
  } as Parameters<typeof client.watchEvent>[0]);

  return unwatch;
}

async function handlePairLog(
  client: PublicClient,
  log: Log,
  logger: Logger,
  onEvent: EventHandler,
): Promise<void> {
  // viem decodes args when matched against the event signature
  const args = (log as unknown as { args: { token0: Address; token1: Address; pair: Address } }).args;
  if (!args) return;

  const { token0, token1, pair } = args;
  // pick the side that is not WETH; if neither, skip (token-token pairs are noise here)
  const token = pickToken(token0, token1);
  if (!token) return;

  const tx = await client.getTransaction({ hash: log.transactionHash! });
  const ev: TokenEvent = {
    chain: "ethereum",
    source: "uniswap_v2",
    token,
    pair,
    deployer: tx.from,
    blockNumber: log.blockNumber!,
    initialLiquidityEth: 0,
    detectedAt: Date.now(),
    txHash: log.transactionHash!,
  };

  logger.debug({ token, pair }, "uniswap_v2 pair created");
  await onEvent(ev);
}

function pickToken(token0: Address, token1: Address): Address | null {
  if (token0.toLowerCase() === WETH.toLowerCase()) return token1;
  if (token1.toLowerCase() === WETH.toLowerCase()) return token0;
  return null;
}
// named abi item — easier to grep
// skip pair=0x0 events on reorg
