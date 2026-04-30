import type { Logger } from "pino";
import { Connection, PublicKey } from "@solana/web3.js";
import type { TokenEvent } from "../types.js";
import type { Env } from "../config.js";

// raydium launchpad program id — bonded-curve launches that graduate to AMM
// once the threshold is hit. shape is similar to pump.fun but the tip side
// (raydium) gets the LP migration on bond.
const RAYDIUM_LAUNCHPAD_PROGRAM = new PublicKey(
  "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
);

export type EventHandler = (ev: TokenEvent) => Promise<void> | void;

export function startRaydiumLaunchpadListener(
  env: Env,
  logger: Logger,
  onEvent: EventHandler,
): () => void {
  const connection = new Connection(env.rpcUrl, {
    wsEndpoint: env.wsUrl || undefined,
    commitment: "confirmed",
  });

  logger.info({ source: "raydium_launchpad" }, "subscribing to program logs");

  const subId = connection.onLogs(
    RAYDIUM_LAUNCHPAD_PROGRAM,
    (logInfo) => {
      handleLogInfo(connection, logInfo, logger, onEvent).catch((err) => {
        logger.error({ err }, "raydium_launchpad handler failed");
      });
    },
    "confirmed",
  );

  return () => {
    connection.removeOnLogsListener(subId).catch(() => {
      /* noop on shutdown */
    });
  };
}

async function handleLogInfo(
  connection: Connection,
  logInfo: { signature: string; err: unknown; logs: string[]; slot?: number },
  logger: Logger,
  onEvent: EventHandler,
): Promise<void> {
  if (logInfo.err) return;

  // launchpad emits explicit "Initialize" / "CreatePool" log lines on create.
  const isCreate = logInfo.logs.some(
    (l) =>
      l.includes("Program log: Instruction: Initialize") ||
      l.includes("Program log: Instruction: CreatePool"),
  );
  if (!isCreate) return;

  const ev: TokenEvent = {
    chain: "solana",
    source: "raydium_launchpad",
    mint: "stub",
    poolOrCurve: null,
    deployer: "stub",
    slot: BigInt(logInfo.slot ?? 0),
    initialLiquiditySol: 0,
    detectedAt: Date.now(),
    signature: logInfo.signature,
  };

  logger.debug({ signature: logInfo.signature }, "raydium_launchpad create candidate");
  await onEvent(ev);
}
// program id pinned, mainnet only
// raydium launchpad bond threshold typically 85 sol
// graduation moment is the actual sniper-attack window
// log-line filter cheap, full decode in enricher
// dry-replay fixture pending
