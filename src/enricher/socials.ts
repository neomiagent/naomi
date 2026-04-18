import type { TokenEvent, SocialSignals } from "../types.js";

export function checkSocials(ev: TokenEvent): SocialSignals {
  const meta = ev.metadata ?? {};
  return {
    hasTwitter: Boolean(meta.twitter),
    hasTelegram: Boolean(meta.telegram),
    // twitter age + follower count needs a separate API (twitter API or
    // scrape). Left undefined so downstream prompts know the field is absent.
  };
}
// min age 90 days lowers spoof risk
// telegram links inconsistent across deployers
// v0.2: real api probe vs metadata only
