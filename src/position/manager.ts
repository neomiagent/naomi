import type { Logger } from "pino";
import type { Config, Env } from "../config.js";
import type { EnrichedToken, Position } from "../types.js";
import type { BuyResult } from "../executor/buy.js";

export class PositionManager {
  private positions = new Map<string, Position>();
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private config: Config,
    private env: Env,
    private logger: Logger,
  ) {}

  async start(): Promise<void> {
    this.timer = setInterval(() => this.tick(), 2_000);
    this.logger.info("position manager started");
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.logger.info({ open: this.openCount() }, "position manager stopped");
  }

  openCount(): number {
    let n = 0;
    for (const p of this.positions.values()) if (p.status === "open") n++;
    return n;
  }

  open(token: EnrichedToken, result: BuyResult): void {
    const pos: Position = {
      mint: token.mint,
      pool: token.pool,
      entryPriceSol: 0,
      amountTokens: result.amountTokens ?? 0,
      // entryPriceSol filled by first tick once price source is wired
      amountSolSpent: result.amountSolSpent ?? 0,
      openedAt: Date.now(),
      highestMultiplier: 1,
      realizedSol: 0,
      status: "open",
      tpHit: [],
    };
    this.positions.set(token.mint, pos);
    this.logger.info({ mint: token.mint, sig: result.signature }, "position opened");
  }

  openPaper(token: EnrichedToken, sizeSol: number): void {
    const pos: Position = {
      mint: token.mint,
      pool: token.pool,
      entryPriceSol: 0,
      amountTokens: 0,
      amountSolSpent: sizeSol,
      openedAt: Date.now(),
      highestMultiplier: 1,
      realizedSol: 0,
      status: "open",
      tpHit: [],
    };
    this.positions.set(token.mint, pos);
  }

  // runs every 2s while positions are open
  private async tick(): Promise<void> {
    for (const pos of this.positions.values()) {
      if (pos.status !== "open") continue;
      try {
        await this.evaluate(pos);
      } catch (err) {
        this.logger.error({ err, mint: pos.mint }, "evaluate failed");
      }
    }
  }

  /**
   * Compute current multiplier vs entry, hit TP rungs, enforce SL/trailing,
   * and watch for dev-sell exit.
   *
   * Implementation is left as a TODO — fill in price fetch (Jupiter quote API,
   * Raydium pool state, or pump.fun curve math) and sell tx builder.
   */
  private async evaluate(pos: Position): Promise<void> {
    void this.config;
    void this.env;
    void pos;
    // TODO:
    //   const mult = await currentMultiplier(pos);
    //   for each tp rung not hit, if mult >= rung[0], partial sell rung[1] of position
    //   if mult <= 1 + sl/100, full close
    //   if pos.highestMultiplier >= trailing_after && mult <= peak * (1 + trailing/100), close
  }
}
