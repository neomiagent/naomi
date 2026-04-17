import type { Logger } from "pino";
import type { Env } from "../config.js";
import type { TokenEvent } from "../types.js";

/**
 * pump.fun listener.
 *
 * Subscribe to pump.fun program account/log events and emit a TokenEvent on every
 * `create` instruction. Recommended transports:
 *   - Helius LaserStream / Yellowstone Geyser gRPC (lowest latency)
 *   - Helius webhooks (simpler, slightly slower)
 *   - Solana WS logsSubscribe on the pump.fun program id (works with any RPC)
 *
 * Plug in your transport below using GEYSER_GRPC_URL / GEYSER_TOKEN from .env.
 */
export async function startPumpfunListener(
  env: Env,
  onEvent: (event: TokenEvent) => Promise<void> | void,
  logger: Logger,
): Promise<void> {
  const log = logger.child({ listener: "pumpfun" });

  if (!env.geyserUrl && !env.wsUrl) {
    log.warn(
      "no GEYSER_GRPC_URL or SOLANA_WS_URL configured — pump.fun listener idle. " +
        "Fill in .env to receive events.",
    );
    return;
  }

  log.info("naomi: pump.fun listener started (stub) — implement transport here");

  // TODO: connect to Geyser/WS, decode pump.fun create events, build TokenEvent.
  // Example shape of an event you should produce:
  //
  // await onEvent({
  //   source: "pumpfun",
  //   mint: "<mint pubkey>",
  //   pool: "<bonding curve pubkey>",
  //   deployer: "<creator pubkey>",
  //   initialLiquiditySol: 0,
  //   detectedAt: Date.now(),
  //   rawTxSignature: "<sig>",
  //   metadata: { name, symbol, uri },
  // });

  void onEvent;
}
