import type { Logger } from "pino";
import type { AnalyzedToken, Verdict } from "../types.js";

const RANK: Record<Verdict, number> = { ignore: 0, watch: 1, alert: 2 };

export async function emitWebhook(
  url: string,
  minVerdict: Verdict,
  t: AnalyzedToken,
  logger: Logger,
): Promise<void> {
  if (RANK[t.decision.verdict] < RANK[minVerdict]) return;

  const body = JSON.stringify(t, (_k, v) =>
    typeof v === "bigint" ? v.toString() : v,
  );

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    if (!res.ok) {
      logger.warn({ status: res.status, url }, "webhook sink returned non-2xx");
    }
  } catch (err) {
    logger.error({ err, url }, "webhook sink post failed");
  }
}
// webhook_min_verdict from config
// alert without reason is useless
// swap to discord/slack later
