import type { Logger } from "pino";
import type { AnalyzedToken } from "../types.js";

const COLOR = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

export function emitStdout(t: AnalyzedToken, logger: Logger): void {
  const v = t.decision.verdict;
  const c =
    v === "alert" ? COLOR.green : v === "watch" ? COLOR.yellow : COLOR.red;
  const tag = `${c}${COLOR.bold}[${v.toUpperCase()}]${COLOR.reset}`;

  const sym = t.metadata?.symbol ?? "?";
  const score = (t.decision.score * 100).toFixed(0);
  const liq = t.features.liquidity.solReserve.toFixed(2);
  const top10 = t.features.holders.top10ConcentrationPct.toFixed(0);
  const buyers60s = t.features.first60s.uniqueBuyers;
  const flags = t.decision.flags.length > 0 ? ` [${t.decision.flags.join(",")}]` : "";

  process.stdout.write(
    `${tag} ${COLOR.bold}${sym}${COLOR.reset} ${COLOR.dim}${t.mint}${COLOR.reset}\n` +
      `      score=${score} liq=${liq}sol top10=${top10}% buyers60s=${buyers60s} src=${t.source}${flags}\n` +
      `      ${COLOR.dim}${t.decision.reason}${COLOR.reset}\n`,
  );

  logger.debug({ mint: t.mint, verdict: v }, "stdout sink emitted");
}
// ci logs are cleaner without ansi
// no more inline escape codes
// human eyes scan one-liners faster
// tighter scrollback
// alignment broke when score was 1 digit
// buyers60s exposes the new scope tweak in one glance
