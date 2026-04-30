export type Chain = "solana";

export type LaunchSource = "pumpfun" | "raydium_launchpad" | "raydium_amm" | "geyser";

// solana base58 pubkey (44 chars typical)
export type Pubkey = string;
// base58 signature (88 chars typical)
export type Signature = string;

export interface TokenEvent {
  chain: Chain;
  source: LaunchSource;
  mint: Pubkey;
  // bonding-curve account on pump.fun, or pool account on raydium
  poolOrCurve: Pubkey | null;
  // fee payer of the create transaction (the "deployer" on solana)
  deployer: Pubkey;
  slot: bigint;
  initialLiquiditySol: number;
  detectedAt: number;
  signature: Signature;
  metadata?: TokenMetadata;
}

export interface TokenMetadata {
  name?: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: bigint;
  uri?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

export interface EnrichedToken extends TokenEvent {
  features: TokenFeatures;
}

export interface TokenFeatures {
  // solana-side equivalent of "honeypot": who can still mess with the mint?
  mintAuthority: MintAuthorityResult;
  // mint metadata + supply layout
  mintMeta: MintMetaFlags;
  // current pool / curve liquidity stats
  liquidity: LiquidityStats;
  // holder concentration
  holders: HolderStats;
  // history of the deployer pubkey
  deployer: DeployerStats;
  // socials lifted from metaplex token metadata
  socials: SocialFlags;
  // the new scope tweak: snapshot of the first 60 seconds after launch
  first60s: First60sSnapshot;
}

export interface MintAuthorityResult {
  // null/None means the authority was renounced (good)
  mintAuthority: Pubkey | null;
  freezeAuthority: Pubkey | null;
  isImmutable: boolean;
  notes: string[];
}

export interface MintMetaFlags {
  decimals: number;
  totalSupply: bigint;
  hasUpdateAuthority: boolean;
  metadataUri: string | null;
  notes: string[];
}

export interface LiquidityStats {
  source: LaunchSource;
  // for pump.fun: bonding-curve sol balance; for raydium: pool sol/token reserves
  solReserve: number;
  tokenReserve: bigint;
  // pump.fun graduation threshold tracking
  bondedPct: number | null;
  notes: string[];
}

export interface HolderStats {
  total: number;
  top10ConcentrationPct: number;
  // wallets that received the token in the very first slot of life
  firstSlotHolders: number;
  notes: string[];
}

export interface DeployerStats {
  pubkey: Pubkey;
  priorTokensDeployed: number;
  ageDays: number;
  // payer balance at the moment the token was created
  solBalanceAtCreate: number;
  notes: string[];
}

export interface SocialFlags {
  twitter?: string;
  telegram?: string;
  website?: string;
  discord?: string;
  matchesNamePattern?: boolean;
  notes: string[];
}

// the first-60s scope tweak — the load-bearing addition over old naomi
export interface First60sSnapshot {
  // number of distinct buyer pubkeys in the first 60s
  uniqueBuyers: number;
  // number of buys observed in the first 60s
  totalBuys: number;
  // largest single buy in lamports during the window
  largestBuyLamports: bigint;
  // jito bundle attribution: how many of the first-60s buys carried a tip
  jitoBundledBuys: number;
  // sniper signal: pubkeys that bought within the first 3 slots
  earlySnipers: Pubkey[];
  // dev wallet showing up as a buyer (suspicious self-buy pattern)
  devSelfBought: boolean;
  notes: string[];
}

export type Verdict = "alert" | "watch" | "ignore";

// returned by ai/filter.ts. consumed by index.ts orchestrator and output sinks.
export interface FilterDecision {
  verdict: Verdict;
  score: number;
  reason: string;
  flags: string[];
}

// the final shape that flows into output sinks.
export interface AnalyzedToken extends EnrichedToken {
  decision: FilterDecision;
  analyzedAt: number;
}
