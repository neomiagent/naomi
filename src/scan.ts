import { Connection, PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import type { Logger } from "pino";
import type { Env } from "./config.js";
import type { Config } from "./config.js";
import type { FilterDecision, Pubkey, TokenEvent } from "./types.js";
import { enrich } from "./enricher/index.js";
import { runFilter } from "./ai/filter.js";

export async function scanOne(
  mint: Pubkey,
  env: Env,
  config: Config,
  logger: Logger,
): Promise<void> {
  const connection = new Connection(env.rpcUrl, "confirmed");

  let decimals = 0;
  let totalSupply = 0n;
  try {
    const m = await getMint(connection, new PublicKey(mint));
    decimals = m.decimals;
    totalSupply = m.supply;
  } catch (err) {
    logger.debug({ err }, "metadata fetch failed");
  }

  const ev: TokenEvent = {
    chain: "solana",
    source: "pumpfun",
    mint,
    poolOrCurve: null,
    deployer: "stub",
    slot: 0n,
    initialLiquiditySol: 0,
    detectedAt: Date.now(),
    signature: "stub",
    metadata: { decimals, totalSupply },
  };

  const enriched = await enrich(ev, env, logger);
  const decision = await runFilter(enriched, env, config, logger);

  printVerdict(mint, decision);
}

function printVerdict(mint: string, d: FilterDecision): void {
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
  process.stdout.write(`${dim}mint${reset}      ${mint}\n`);
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
