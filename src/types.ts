export type Chain = "ethereum";

export type LaunchSource = "uniswap_v2" | "uniswap_v3" | "mempool";

export type Address = `0x${string}`;
export type Hex = `0x${string}`;

export interface TokenEvent {
  chain: Chain;
  source: LaunchSource;
  token: Address;
  pair: Address | null;
  deployer: Address;
  blockNumber: bigint;
  initialLiquidityEth: number;
  detectedAt: number;
  txHash: Hex;
  metadata?: TokenMetadata;
}

export interface TokenMetadata {
  name?: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: bigint;
  twitter?: string;
  telegram?: string;
  website?: string;
}

export interface EnrichedToken extends TokenEvent {
  features: TokenFeatures;
}

export interface TokenFeatures {
  honeypot: HoneypotResult;
  contract: ContractFlags;
  liquidity: LiquidityStats;
  holders: HolderStats;
  deployer: DeployerStats;
  socials: SocialSignals;
}

export interface HoneypotResult {
  canBuy: boolean;
  canSell: boolean;
  buyTaxBps: number;
  sellTaxBps: number;
  simulationOk: boolean;
  reason?: string;
}

export interface ContractFlags {
  verified: boolean;
  ownershipRenounced: boolean;
  hasMintFunction: boolean;
  hasBlacklistFunction: boolean;
  hasPauseFunction: boolean;
  proxyContract: boolean;
}

export interface LiquidityStats {
  poolEthValue: number;
  lpTokenLocked: boolean;
  lpLockExpiry?: number;
  lpBurnedPct: number;
}

export interface HolderStats {
  uniqueHolders: number;
  top10Pct: number;
  deployerHoldsPct: number;
}

export interface DeployerStats {
  address: Address;
  tokensLaunched: number;
  rugRatio: number;
  bestMultiplier: number;
  knownScammer: boolean;
}

export interface SocialSignals {
  hasTwitter: boolean;
  hasTelegram: boolean;
  twitterAgeDays?: number;
  twitterFollowers?: number;
}

export type Verdict = "alert" | "watch" | "ignore";

export interface FilterDecision {
  verdict: Verdict;
  score: number;
  reason: string;
  flags: string[];
}

export interface AnalyzedToken extends EnrichedToken {
  decision: FilterDecision;
  analyzedAt: number;
}
// drives source-aware filters
// alert | watch | ignore
// snapshots should not mutate post-enrich
// shape persisted to jsonl
// trace is the verb we use elsewhere
// older fixtures lacked socials block
// auto-imports show better hovers
