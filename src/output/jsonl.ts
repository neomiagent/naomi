import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { Logger } from "pino";
import type { AnalyzedToken } from "../types.js";

let prepared = false;

export async function emitJsonl(
  path: string,
  t: AnalyzedToken,
  logger: Logger,
): Promise<void> {
  if (!prepared) {
    await mkdir(dirname(path), { recursive: true });
    prepared = true;
  }

  // bigints in TokenEvent (blockNumber, totalSupply) need a custom replacer
  const line =
    JSON.stringify(t, (_k, v) => (typeof v === "bigint" ? v.toString() : v)) + "\n";
  try {
    await appendFile(path, line);
  } catch (err) {
    logger.error({ err, path }, "jsonl sink write failed");
  }
}
// JSON.stringify cannot serialize bigint
