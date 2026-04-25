import { createPublicClient, http, type Address, type Hex } from "viem";
import { mainnet } from "viem/chains";
import type { Logger } from "pino";
import type { Env } from "./config.js";
import type { Config } from "./config.js";
import type { TokenEvent, FilterDecision } from "./types.js";
import { enrich } from "./enricher/index.js";
import { runFilter } from "./ai/filter.js";

const FACTORY_V2 = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f" as const;
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as const;
const ZERO = "0x0000000000000000000000000000000000000000" as const;

const erc20Abi = [
  { inputs: [], name: "name", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "decimals", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
] as const;

const factoryV2Abi = [
  {
    inputs: [{ type: "address" }, { type: "address" }],
    name: "getPair",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export async function scanOne(
  address: Address,
  env: Env,
  config: Config,
  logger: Logger,
): Promise<void> {
  const client = createPublicClient({ chain: mainnet, transport: http(env.rpcUrl) });

  let name: string | undefined;
  let symbol: string | undefined;
  try {
    const [n, s] = await Promise.all([
      client.readContract({ address, abi: erc20Abi, functionName: "name" }),
      client.readContract({ address, abi: erc20Abi, functionName: "symbol" }),
    ]);
    name = n as string;
    symbol = s as string;
  } catch (err) {
    logger.debug({ err }, "metadata fetch failed");
  }

  let pair: Address | null = null;
  try {
    const result = (await client.readContract({
      address: FACTORY_V2,
      abi: factoryV2Abi,
      functionName: "getPair",
      args: [address, WETH],
    })) as Address;
    if (result.toLowerCase() !== ZERO) pair = result;
  } catch (err) {
    logger.debug({ err }, "factory pair lookup failed");
  }

  const ev: TokenEvent = {
    chain: "ethereum",
    source: "uniswap_v2",
    token: address,
    pair,
    deployer: ZERO,
    blockNumber: 0n,
    initialLiquidityEth: 0,
    detectedAt: Date.now(),
    txHash: "0x0" as Hex,
    metadata: { name, symbol },
  };

  const enriched = await enrich(ev, env, logger);
  const decision = await runFilter(enriched, env, config, logger);

  printVerdict(address, symbol, decision);
}

function printVerdict(token: string, symbol: string | undefined, d: FilterDecision): void {
  const id =
    String(Math.floor(Math.random() * 9999)).padStart(4, "0") +
    "-" +
    String(Math.floor(Math.random() * 99)).padStart(2, "0");

  const verdict = d.verdict.toUpperCase();
  const color =
    verdict === "ALERT" ? "\x1b[32m" : verdict === "WATCH" ? "\x1b[33m" : "\x1b[31m";
  const reset = "\x1b[0m";
  const dim = "\x1b[2m";
  const cyan = "\x1b[36m";
  const bold = "\x1b[1m";

  const line = "─".repeat(56);
  const score100 = Math.round((d.score ?? 0) * 100);

  process.stdout.write("\n");
  process.stdout.write(`${cyan}${bold}naomi${reset}  ${dim}//${reset}  ${cyan}ID: ${id}${reset}\n`);
  process.stdout.write(`${dim}${line}${reset}\n`);
  process.stdout.write(`${dim}token${reset}     ${token}\n`);
  if (symbol) process.stdout.write(`${dim}symbol${reset}    $${symbol}\n`);
  process.stdout.write(`${dim}scanned${reset}   ${new Date().toISOString()}\n`);
  process.stdout.write(`${dim}score${reset}     ${score100}/100\n`);
  process.stdout.write(`${dim}verdict${reset}   ${color}${bold}${verdict}${reset}\n`);
  process.stdout.write(`${dim}${line}${reset}\n`);
  process.stdout.write(`${d.reason}\n`);
  if (d.flags && d.flags.length) {
    process.stdout.write(`${dim}flags: ${d.flags.join(", ")}${reset}\n`);
  }
  process.stdout.write("\n");

  const bars = ["│", "││", "│││", "││││"];
  const pattern = Array.from(
    { length: 7 },
    () => bars[Math.floor(Math.random() * bars.length)],
  ).join(" ");
  process.stdout.write(`${dim}${pattern}  ${id}  ${pattern}${reset}\n\n`);
}
