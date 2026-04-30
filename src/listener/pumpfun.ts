import type { Logger } from "pino";
import { Connection, PublicKey } from "@solana/web3.js";
import type { TokenEvent } from "../types.js";
import type { Env } from "../config.js";

// pump.fun program id — token-creation events flow through here.
// see: https://docs.pump.fun
const PUMPFUN_PROGRAM = new PublicKey(
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
);

// the create instruction discriminator (anchor 8-byte). emitted as the first
// inner-instruction of every token-creation tx.
const CREATE_DISC = "82a2124e4f31"; // first 12 hex chars of the anchor disc

export type EventHandler = (ev: TokenEvent) => Promise<void> | void;

export function startPumpfunListener(
  env: Env,
  logger: Logger,
  onEvent: EventHandler,
): () => void {
  const connection = new Connection(env.rpcUrl, {
    wsEndpoint: env.wsUrl || undefined,
    commitment: "confirmed",
  });

  logger.info({ source: "pumpfun" }, "subscribing to program logs");

  // logsSubscribe with mentions filter is the lightest way to find creation
  // candidates without ingesting full block bodies. we then fetch the tx
  // bodies on hits and decode the inner instructions.
  // TODO(0xnova): swap for geyser when env.geyserGrpcUrl is set.
  const subId = connection.onLogs(
    PUMPFUN_PROGRAM,
    (logInfo) => {
      handleLogInfo(connection, logInfo, logger, onEvent).catch((err) => {
        logger.error({ err }, "pumpfun handler failed");
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

  // cheap pre-filter on the log lines before paying for getTransaction
  const isCreate = logInfo.logs.some(
    (l) => l.includes("Program log: create") || l.includes(CREATE_DISC),
  );
  if (!isCreate) return;

  // TODO(senri): full inner-instruction decode + metaplex metadata fetch.
  // for v0.2 we emit a stub event; the enricher fills the rest.
  const ev: TokenEvent = {
    chain: "solana",
    source: "pumpfun",
    mint: "stub",
    poolOrCurve: null,
    deployer: "stub",
    slot: BigInt(logInfo.slot ?? 0),
    initialLiquiditySol: 0,
    detectedAt: Date.now(),
    signature: logInfo.signature,
  };

  logger.debug({ signature: logInfo.signature }, "pumpfun create candidate");
  await onEvent(ev);
}
// program id pinned, mainnet only
// logsSubscribe is cheaper than getProgramAccounts polling
// TODO geyser path lands in v0.3
// reorgs on solana are rare past confirmed
// pump.fun frequently re-deploys helper programs
// downstream uses the stub fields then enriches
// dry-replay fixture pending
// signature is canonical id on solana
