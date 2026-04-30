import type { SocialFlags, TokenEvent } from "../types.js";

// extracts socials from the metaplex metadata uri (when present). pump.fun
// tokens carry uri pointing at a json with twitter/telegram/website fields.
//
// for v0.2 we only check metadata embedded in the event. v0.3 will fetch
// the metadata json and parse it.

export function checkSocials(ev: TokenEvent): SocialFlags {
  const meta = ev.metadata ?? {};
  const flags: SocialFlags = {
    twitter: meta.twitter,
    telegram: meta.telegram,
    website: meta.website,
    notes: [],
  };

  if (!flags.twitter && !flags.telegram && !flags.website) {
    flags.notes.push("socials:none_listed");
  }
  if (meta.name && meta.symbol && meta.symbol.toLowerCase() === meta.name.toLowerCase()) {
    flags.matchesNamePattern = true;
    flags.notes.push("socials:name_equals_symbol");
  }
  return flags;
}
// metaplex uri parse lands in v0.3
// suspicious: name == symbol pattern from low-effort copies
// fixture replay pending
