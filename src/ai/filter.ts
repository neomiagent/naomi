import Anthropic from "@anthropic-ai/sdk";
import type { Logger } from "pino";
import type { Config, Env } from "../config.js";
import type { EnrichedToken, FilterDecision } from "../types.js";

const SYSTEM_PROMPT = `You are Naomi, a Solana token-launch forensic analyzer.

You receive a JSON snapshot of a freshly created pump.fun or raydium-launchpad token: mint authority status, mint metadata, liquidity (bonding-curve or pool), holders, deployer history, social signals, and a "first 60 seconds" snapshot covering buyers, jito-tagged bundles, sniper pubkeys, and whether the deployer self-bought during the window.

Return ONLY a JSON object with these fields:
{
  "verdict": "alert" | "watch" | "ignore",
  "score": number between 0 and 1,
  "reason": "short string, max 140 chars",
  "flags": ["short_tag_1", "short_tag_2", ...]
}

Verdict definitions:
- "alert": authorities renounced, healthy buyer distribution in first 60s, deployer not self-buying, low jito-bundle concentration. Worth attention.
- "watch": passes basic safety but has one or two yellow flags (low buyer count in 60s, single dominant buyer, no socials, mutable metadata).
- "ignore": clear rug signals — mint or freeze authority not renounced on a memecoin, dev self-bought in first 60s, top-10 holder concentration too high, deployer with prior rug history, jito-bundle dominance suggesting coordinated sniping.

Hard rules:
- mintAuthority.mintAuthority != null on a memecoin → ignore.
- mintAuthority.freezeAuthority != null on a memecoin → ignore.
- first60s.devSelfBought == true → ignore.
- holders.top10ConcentrationPct > 70 (excluding bonding curve / pool) → ignore.
- deployer.priorTokensDeployed > 5 with deployer.ageDays < 30 → ignore.
- first60s.jitoBundledBuys > 0.6 * first60s.totalBuys → ignore (coordinated sniping).
- liquidity below 1 SOL and no socials → ignore.

Be precise. The output is consumed by humans and webhooks for decision support, not for automated trading. Naomi does not trade. Naomi reports.`;

export async function runFilter(
  token: EnrichedToken,
  env: Env,
  config: Config,
  logger: Logger,
): Promise<FilterDecision> {
  if (!config.ai.enabled || !env.anthropicApiKey) {
    return heuristicOnly(token);
  }

  const client = new Anthropic({ apiKey: env.anthropicApiKey });

  const userPayload = JSON.stringify(
    {
      mint: token.mint,
      poolOrCurve: token.poolOrCurve,
      source: token.source,
      initialLiquiditySol: token.initialLiquiditySol,
      metadata: token.metadata,
      features: serializeFeatures(token),
    },
    bigintReplacer,
    2,
  );

  try {
    const response = await client.messages.create({
      model: env.anthropicModel,
      max_tokens: 384,
      // sdk types vary across versions; runtime accepts the cached array form on >=0.27
      system: (config.ai.prompt_cache
        ? [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }]
        : SYSTEM_PROMPT) as Anthropic.Messages.MessageCreateParams["system"],
      messages: [{ role: "user", content: userPayload }],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");

    return parseDecision(text);
  } catch (err) {
    logger.error({ err }, "ai filter call failed, falling back to heuristics");
    return heuristicOnly(token);
  }
}

function heuristicOnly(token: EnrichedToken): FilterDecision {
  const flags: string[] = [];
  const f = token.features;

  if (f.mintAuthority.mintAuthority !== null) flags.push("mint_authority_active");
  if (f.mintAuthority.freezeAuthority !== null) flags.push("freeze_authority_active");
  if (f.first60s.devSelfBought) flags.push("dev_self_bought");
  if (f.holders.top10ConcentrationPct > 70) flags.push("top10_concentrated");
  if (f.liquidity.solReserve < 1) flags.push("low_liquidity");
  if (f.deployer.priorTokensDeployed > 5 && f.deployer.ageDays < 30) {
    flags.push("rug_history");
  }
  if (
    f.first60s.totalBuys > 0 &&
    f.first60s.jitoBundledBuys / f.first60s.totalBuys > 0.6
  ) {
    flags.push("jito_bundle_dominance");
  }

  const blockers = flags.filter((x) =>
    [
      "mint_authority_active",
      "freeze_authority_active",
      "dev_self_bought",
      "rug_history",
      "jito_bundle_dominance",
    ].includes(x),
  );
  if (blockers.length > 0) {
    return { verdict: "ignore", score: 0, reason: `blocked: ${blockers.join(", ")}`, flags };
  }
  if (flags.length === 0 && f.mintAuthority.isImmutable) {
    return {
      verdict: "alert",
      score: 0.7,
      reason: "clean snapshot, authorities renounced",
      flags,
    };
  }
  return { verdict: "watch", score: 0.4, reason: "yellow flags only", flags };
}

function parseDecision(text: string): FilterDecision {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { verdict: "ignore", score: 0, reason: "unparseable", flags: [] };
  try {
    const obj = JSON.parse(match[0]);
    const verdict =
      obj.verdict === "alert" || obj.verdict === "watch" ? obj.verdict : "ignore";
    return {
      verdict,
      score: typeof obj.score === "number" ? Math.max(0, Math.min(0.95, obj.score)) : 0,
      reason: typeof obj.reason === "string" ? obj.reason.slice(0, 140) : "",
      flags: Array.isArray(obj.flags) ? obj.flags.filter((x: unknown) => typeof x === "string") : [],
    };
  } catch {
    return { verdict: "ignore", score: 0, reason: "json parse error", flags: [] };
  }
}

function serializeFeatures(token: EnrichedToken) {
  // top-level features object is fine; bigint fields will be coerced via replacer.
  return token.features;
}

function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}
// saves tokens on burst windows
// model sometimes adds 'here is the verdict:' prefix
// shared with output sinks
// naomi must work key-less for ci
// verdicts are short, prevent runaway
// score capped at 0.95 — detector, not oracle
// dev self-buying in first 60s is the cleanest single rug-warmup signal on solana
