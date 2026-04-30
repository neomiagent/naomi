import type { Logger } from "pino";
import { Connection, PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import type { MintMetaFlags, Pubkey } from "../types.js";
import type { Env } from "../config.js";

// solana-side metadata flags. checks decimals, total supply, and whether the
// metaplex metadata is mutable (an update_authority that can change the token
// name/uri after launch is a soft red flag).

export async function checkMintMeta(
  mint: Pubkey,
  env: Env,
  logger: Logger,
): Promise<MintMetaFlags> {
  if (!env.rpcUrl || mint === "stub") {
    return {
      decimals: 0,
      totalSupply: 0n,
      hasUpdateAuthority: false,
      metadataUri: null,
      notes: ["skipped:no_rpc_or_stub_event"],
    };
  }

  try {
    const connection = new Connection(env.rpcUrl, "confirmed");
    const mintInfo = await getMint(connection, new PublicKey(mint));

    // metaplex metadata pda fetch is wired in v0.3 — for now just expose
    // the spl-token-level fields and a placeholder for the metadata uri.
    return {
      decimals: mintInfo.decimals,
      totalSupply: mintInfo.supply,
      hasUpdateAuthority: false,
      metadataUri: null,
      notes: ["metaplex_meta:not_yet_fetched"],
    };
  } catch (err) {
    logger.warn({ err, mint }, "mint_meta lookup failed");
    return {
      decimals: 0,
      totalSupply: 0n,
      hasUpdateAuthority: false,
      metadataUri: null,
      notes: ["error:lookup_failed"],
    };
  }
}
// metaplex metadata is at PDA derived from ['metadata', metadata_program_id, mint]
// update_authority on metaplex == ability to rename token; a soft signal
// fixture replay pending
