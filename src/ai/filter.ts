import Anthropic from "@anthropic-ai/sdk";
import type { Logger } from "pino";
import type { Config, Env } from "../config.js";
import type { EnrichedToken, FilterDecision } from "../types.js";

const SYSTEM_PROMPT = `You are Naomi, a Solana memecoin sniper's risk filter.

You receive a JSON snapshot of a freshly launched token: holders, deployer history, bundle stats, social signals.

Return ONLY a JSON object with these fields:
{
  "action": "snipe" | "skip",
  "score": number between 0 and 1,
  "reason": "short string, max 120 chars"
}

Heuristics:
- Heavy bundle (>5 wallets in launch tx funded from same source) → skip.
- Top 10 holders >70% (excluding LP/curve) → skip unless burned LP and locked supply.
- Deployer with rug ratio >40% historically → skip.
- No socials at all + low initial liquidity (<2 SOL) → skip.
- Mint or freeze authority still active → skip (rug vector).
- Strong signal: real socials with aged twitter, deployer with prior runner, clean cap table → snipe with high score.

Be skeptical. False positive on snipe is much costlier than false negative.`;

export async function runFilter(
  token: EnrichedToken,
  env: Env,
  config: Config,
  logger: Logger,
): Promise<FilterDecision> {
  if (!env.anthropicApiKey) {
    logger.warn("ANTHROPIC_API_KEY not set, defaulting to skip");
    return { action: "skip", score: 0, reason: "no api key" };
  }

  const client = new Anthropic({ apiKey: env.anthropicApiKey });

  const userPayload = JSON.stringify(
    {
      mint: token.mint,
      source: token.source,
      initialLiquiditySol: token.initialLiquiditySol,
      metadata: token.metadata,
      features: token.features,
    },
    null,
    2,
  );

  try {
    const response = await client.messages.create({
      model: env.anthropicModel,
      max_tokens: 256,
      system: config.ai.prompt_cache
        ? [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }]
        : SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPayload }],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");

    const parsed = parseDecision(text);
    return parsed;
  } catch (err) {
    logger.error({ err }, "ai filter call failed");
    return { action: "skip", score: 0, reason: "ai error" };
  }
}

function parseDecision(text: string): FilterDecision {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { action: "skip", score: 0, reason: "unparseable" };
  try {
    const obj = JSON.parse(match[0]);
    return {
      action: obj.action === "snipe" ? "snipe" : "skip",
      score: typeof obj.score === "number" ? obj.score : 0,
      reason: typeof obj.reason === "string" ? obj.reason.slice(0, 120) : "",
    };
  } catch {
    return { action: "skip", score: 0, reason: "json parse error" };
  }
}
