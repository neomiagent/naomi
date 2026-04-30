import type { Logger } from "pino";
import { Connection, PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import type { MintAuthorityResult, Pubkey, TokenEvent } from "../types.js";
import type { Env } from "../config.js";

// solana-side equivalent of "honeypot": checks who can still mess with the
// mint after launch. mint_authority == null means new tokens cannot be minted
// (good). freeze_authority == null means accounts cannot be frozen (good).
// metaplex update authority is checked separately in mint_meta.ts.

export async function checkMintAuthority(
  ev: TokenEvent,
  env: Env,
  logger: Logger,
): Promise<MintAuthorityResult> {
  if (!env.rpcUrl || ev.mint === "stub") {
    return {
      mintAuthority: null,
      freezeAuthority: null,
      isImmutable: false,
      notes: ["skipped:no_rpc_or_stub_event"],
    };
  }

  try {
    const connection = new Connection(env.rpcUrl, "confirmed");
    const mintInfo = await getMint(connection, new PublicKey(ev.mint));
    const mintAuthority: Pubkey | null = mintInfo.mintAuthority?.toBase58() ?? null;
    const freezeAuthority: Pubkey | null = mintInfo.freezeAuthority?.toBase58() ?? null;
    const isImmutable = mintAuthority === null && freezeAuthority === null;
    const notes: string[] = [];
    if (mintAuthority !== null) notes.push("mint_authority:not_renounced");
    if (freezeAuthority !== null) notes.push("freeze_authority:not_renounced");
    if (isImmutable) notes.push("mint_authority:fully_renounced");
    return { mintAuthority, freezeAuthority, isImmutable, notes };
  } catch (err) {
    logger.warn({ err, mint: ev.mint }, "mint_authority lookup failed");
    return {
      mintAuthority: null,
      freezeAuthority: null,
      isImmutable: false,
      notes: ["error:lookup_failed"],
    };
  }
}
// mint authority null is the "renounced" state on solana
// freeze authority on memecoins is unusual and a red flag
// this is the closest semantic match to honeypot from the eth era
// fixture replay pending
