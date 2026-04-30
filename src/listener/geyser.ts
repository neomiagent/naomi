import type { Logger } from "pino";
import type { TokenEvent } from "../types.js";
import type { Env } from "../config.js";

// geyser / yellowstone-grpc subscriber.
//
// stub. real impl lands in v0.3 when the python bindings or a yellowstone
// typescript client matures. for now this exists so the rest of the pipeline
// can be exercised without a grpc endpoint.
//
// TODO(0xnova): wire @triton-one/yellowstone-grpc with mentions filter on
// pump.fun + raydium-launchpad program ids. tracking issue: #14.

export type EventHandler = (ev: TokenEvent) => Promise<void> | void;

export function startGeyserListener(
  env: Env,
  logger: Logger,
  _onEvent: EventHandler,
): () => void {
  if (!env.geyserGrpcUrl) {
    logger.warn({ source: "geyser" }, "no SOL_GEYSER_GRPC_URL set, listener inactive");
    return () => undefined;
  }

  logger.info({ source: "geyser", url: env.geyserGrpcUrl }, "geyser stub started");
  // TODO: open grpc subscribe with TransactionsSubscribeFilter:
  //   accountInclude: [PUMPFUN_PROGRAM, RAYDIUM_LAUNCHPAD_PROGRAM]
  // and emit a TokenEvent per matched create-tx.

  return () => {
    logger.info({ source: "geyser" }, "geyser stub stopped");
  };
}
// triton client is the canonical yellowstone ts binding
// helius offers a hosted grpc endpoint
// shyft also exposes geyser
// fixture replay pending
// dry-replay fixture pending
