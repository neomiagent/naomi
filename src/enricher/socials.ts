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
