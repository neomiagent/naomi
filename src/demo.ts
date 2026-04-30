// scripted offline demo. zero network. deterministic output.
//
// runs three pre-baked enriched fixtures through the heuristic-only filter
// path and emits them via the stdout sink. the spectrum (alert / watch /
// ignore) is intentional: the demo shows naomi's full verdict range in one
// run.
//
// to add fixtures, append an EnrichedToken to DEMO_FIXTURES below. the
// shape is the same as anything that flows through the live pipeline; only
// the data is hand-rolled.

import type { Logger } from "pino";
import type { Config, Env } from "./config.js";
import type { AnalyzedToken, EnrichedToken } from "./types.js";
import { runFilter } from "./ai/filter.js";
import { emitStdout } from "./output/stdout.js";

// solana mints. real public addresses for visual realism. NOT being scored
// against real chain data — the snapshot below is hand-rolled.
export const DEMO_FIXTURES: EnrichedToken[] = [
  // 1. clean launch — should resolve to ALERT
  {
    chain: "solana",
    source: "pumpfun",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    poolOrCurve: "8sLbNZoA1cfnvMJLPfp98ZLAnFSYCFApfJKMbiXNLwxj",
    deployer: "DemoDevA1mF4n2GPzS5kfhV4JmU9wXM7t1n9hVyN3wQ8",
    slot: 287_412_001n,
    initialLiquiditySol: 12.4,
    detectedAt: Date.now(),
    signature: "DemoSig1clean000000000000000000000000000000000000000000000000000000000000",
    metadata: {
      name: "Sample Clean",
      symbol: "WIF",
      decimals: 6,
      totalSupply: 1_000_000_000n,
      twitter: "wifofficial",
      telegram: "wif_chat",
      website: "wif.dog",
    },
    features: {
      mintAuthority: {
        mintAuthority: null,
        freezeAuthority: null,
        isImmutable: true,
        notes: ["mint_authority:fully_renounced"],
      },
      mintMeta: {
        decimals: 6,
        totalSupply: 1_000_000_000n,
        hasUpdateAuthority: false,
        metadataUri: "https://arweave.net/demo-clean",
        notes: [],
      },
      liquidity: {
        source: "pumpfun",
        solReserve: 12.4,
        tokenReserve: 820_000_000n,
        bondedPct: 14.5,
        notes: [],
      },
      holders: {
        total: 84,
        top10ConcentrationPct: 18,
        firstSlotHolders: 0,
        notes: [],
      },
      deployer: {
        pubkey: "DemoDevA1mF4n2GPzS5kfhV4JmU9wXM7t1n9hVyN3wQ8",
        priorTokensDeployed: 2,
        ageDays: 312,
        solBalanceAtCreate: 4.8,
        notes: [],
      },
      socials: {
        twitter: "wifofficial",
        telegram: "wif_chat",
        website: "wif.dog",
        notes: [],
      },
      first60s: {
        uniqueBuyers: 24,
        totalBuys: 31,
        largestBuyLamports: 800_000_000n,
        jitoBundledBuys: 3,
        earlySnipers: [],
        devSelfBought: false,
        notes: [],
      },
    },
  },

  // 2. yellow-flag launch — should resolve to WATCH
  {
    chain: "solana",
    source: "raydium_launchpad",
    mint: "5fBpMZswQEZ3X8rFK1VoZjt8vGNcTzCuAa4yDqHVK1m9",
    poolOrCurve: "RayLP3demo000000000000000000000000000000000",
    deployer: "DemoDevB7kHnYpQ4M2vXjL5sP8tCwR3eN6gW9hKxY1zU",
    slot: 287_412_345n,
    initialLiquiditySol: 0.8,
    detectedAt: Date.now(),
    signature: "DemoSig2watch000000000000000000000000000000000000000000000000000000000000",
    metadata: {
      name: "Sample Watch",
      symbol: "TROLL",
      decimals: 9,
      totalSupply: 500_000_000n,
    },
    features: {
      mintAuthority: {
        mintAuthority: null,
        freezeAuthority: null,
        isImmutable: true,
        notes: ["mint_authority:fully_renounced"],
      },
      mintMeta: {
        decimals: 9,
        totalSupply: 500_000_000n,
        hasUpdateAuthority: false,
        metadataUri: null,
        notes: ["metaplex_meta:not_yet_fetched"],
      },
      liquidity: {
        source: "raydium_launchpad",
        solReserve: 0.8,
        tokenReserve: 240_000_000n,
        bondedPct: 0.9,
        notes: ["liquidity:thin"],
      },
      holders: {
        total: 11,
        top10ConcentrationPct: 42,
        firstSlotHolders: 1,
        notes: [],
      },
      deployer: {
        pubkey: "DemoDevB7kHnYpQ4M2vXjL5sP8tCwR3eN6gW9hKxY1zU",
        priorTokensDeployed: 1,
        ageDays: 41,
        solBalanceAtCreate: 0.6,
        notes: [],
      },
      socials: {
        notes: ["socials:none_listed"],
      },
      first60s: {
        uniqueBuyers: 6,
        totalBuys: 9,
        largestBuyLamports: 320_000_000n,
        jitoBundledBuys: 1,
        earlySnipers: [],
        devSelfBought: false,
        notes: [],
      },
    },
  },

  // 3. dev self-bought + jito dominance — should resolve to IGNORE
  {
    chain: "solana",
    source: "pumpfun",
    mint: "7HzPvBhdVR4Mr8qGHMvSQsQqAhnX1qPpe9R2mNqQa5eX",
    poolOrCurve: "BondingCurve3demo000000000000000000000000000",
    deployer: "DemoDevC2pJqVkXsT4nWuZ7B3HmQyNcL9rPe6KvD1aS",
    slot: 287_412_990n,
    initialLiquiditySol: 0.2,
    detectedAt: Date.now(),
    signature: "DemoSig3ignore00000000000000000000000000000000000000000000000000000000000",
    metadata: {
      name: "Sample Rug",
      symbol: "RUG",
      decimals: 6,
      totalSupply: 1_000_000_000n,
    },
    features: {
      mintAuthority: {
        mintAuthority: "DemoDevC2pJqVkXsT4nWuZ7B3HmQyNcL9rPe6KvD1aS",
        freezeAuthority: "DemoDevC2pJqVkXsT4nWuZ7B3HmQyNcL9rPe6KvD1aS",
        isImmutable: false,
        notes: [
          "mint_authority:not_renounced",
          "freeze_authority:not_renounced",
        ],
      },
      mintMeta: {
        decimals: 6,
        totalSupply: 1_000_000_000n,
        hasUpdateAuthority: true,
        metadataUri: null,
        notes: ["metaplex_meta:mutable"],
      },
      liquidity: {
        source: "pumpfun",
        solReserve: 0.2,
        tokenReserve: 980_000_000n,
        bondedPct: 0.2,
        notes: ["liquidity:near_empty"],
      },
      holders: {
        total: 4,
        top10ConcentrationPct: 88,
        firstSlotHolders: 3,
        notes: [],
      },
      deployer: {
        pubkey: "DemoDevC2pJqVkXsT4nWuZ7B3HmQyNcL9rPe6KvD1aS",
        priorTokensDeployed: 7,
        ageDays: 12,
        solBalanceAtCreate: 0.3,
        notes: ["deployer:young_wallet_high_volume"],
      },
      socials: {
        notes: ["socials:none_listed"],
      },
      first60s: {
        uniqueBuyers: 2,
        totalBuys: 5,
        largestBuyLamports: 400_000_000n,
        jitoBundledBuys: 4,
        earlySnipers: [
          "DemoSnp1aB3cD5eF7gH9iJ1kL3mN5oP7qR9sT1uV3wX5yZ7",
          "DemoSnp2cD5eF7gH9iJ1kL3mN5oP7qR9sT1uV3wX5yZ7aB3",
        ],
        devSelfBought: true,
        notes: ["first_60s:dev_self_buy_detected"],
      },
    },
  },
];

// fast lookup map. used by `naomi scan <mint>` to short-circuit into
// rich fixture output when the user is following the screencast script.
export const DEMO_FIXTURES_BY_MINT: Record<string, EnrichedToken> =
  Object.fromEntries(DEMO_FIXTURES.map((f) => [f.mint, f]));

export async function runDemo(
  env: Env,
  config: Config,
  logger: Logger,
): Promise<void> {
  // force heuristic-only path: deterministic, fast, no api calls.
  const demoConfig: Config = {
    ...config,
    ai: { ...config.ai, enabled: false },
  };

  process.stdout.write(
    "\nnaomi demo. three fixtures, three verdicts. deterministic, no network.\n\n",
  );

  for (const enriched of DEMO_FIXTURES) {
    const decision = await runFilter(enriched, env, demoConfig, logger);
    const analyzed: AnalyzedToken = {
      ...enriched,
      decision,
      analyzedAt: Date.now(),
    };
    emitStdout(analyzed, logger);
  }

  process.stdout.write(
    "\nnone of the above are real on-chain verdicts. each fixture is hand-rolled\n" +
      "to demonstrate the verdict spectrum. read /src/demo.ts for the data shapes.\n\n",
  );
}
