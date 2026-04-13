import Anthropic from "@anthropic-ai/sdk";
import type { Logger } from "pino";
import type { Config, Env } from "../config.js";
import type { EnrichedToken, FilterDecision } from "../types.js";

const SYSTEM_PROMPT = `You are Naomi, an Ethereum token-launch risk analyzer.

You receive a JSON snapshot of a freshly created Uniswap pool: contract flags, honeypot simulation result, liquidity, holders, deployer history, social signals.

Return ONLY a JSON object with these fields:
{
  "verdict": "alert" | "watch" | "ignore",
  "score": number between 0 and 1,
  "reason": "short string, max 140 chars",
  "flags": ["short_tag_1", "short_tag_2", ...]
}

Verdict definitions:
- "alert": clean cap table, locked or burned LP, no honeypot, deployer with track record. Worth attention.
- "watch": passes basic safety but has one or two yellow flags (low liquidity, unverified, no socials).
- "ignore": clear rug signals, honeypot, mint/blacklist function active, top10 concentration too high, deployer with rug history.

Hard rules:
- honeypot.canSell == false → ignore.
- contract.hasMintFunction && !contract.ownershipRenounced → ignore.
- contract.hasBlacklistFunction → ignore.
- holders.top10Pct > 70 (excluding LP and burn) → ignore unless LP burned >95%.
- deployer.rugRatio > 0.4 with >3 prior launches → ignore.
- liquidity below 1 ETH and no socials → ignore.

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
      token: token.token,
      pair: token.pair,
      source: token.source,
      initialLiquidityEth: token.initialLiquidityEth,
      metadata: token.metadata,
      features: token.features,
    },
    null,
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

  if (!f.honeypot.canSell) flags.push("honeypot");
  if (f.contract.hasMintFunction && !f.contract.ownershipRenounced) flags.push("mint_active");
  if (f.contract.hasBlacklistFunction) flags.push("blacklist");
  if (!f.contract.verified) flags.push("unverified");
  if (f.holders.top10Pct > 70) flags.push("top10_concentrated");
  if (f.liquidity.poolEthValue < 1) flags.push("low_liquidity");
  if (f.deployer.rugRatio > 0.4 && f.deployer.tokensLaunched > 3) flags.push("rug_history");

  const blockers = flags.filter((x) =>
    ["honeypot", "mint_active", "blacklist", "rug_history"].includes(x),
  );
  if (blockers.length > 0) {
    return { verdict: "ignore", score: 0, reason: `blocked: ${blockers.join(", ")}`, flags };
  }
  if (flags.length === 0 && f.liquidity.lpTokenLocked) {
    return { verdict: "alert", score: 0.7, reason: "clean snapshot, lp locked", flags };
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
      score: typeof obj.score === "number" ? Math.max(0, Math.min(1, obj.score)) : 0,
      reason: typeof obj.reason === "string" ? obj.reason.slice(0, 140) : "",
      flags: Array.isArray(obj.flags) ? obj.flags.filter((x: unknown) => typeof x === "string") : [],
    };
  } catch {
    return { verdict: "ignore", score: 0, reason: "json parse error", flags: [] };
  }
}
