export type LaunchSource = "pumpfun" | "raydium" | "meteora";

export interface TokenEvent {
  source: LaunchSource;
  mint: string;
  pool: string;
  deployer: string;
  initialLiquiditySol: number;
  detectedAt: number;
  rawTxSignature: string;
  metadata?: TokenMetadata;
}

export interface TokenMetadata {
  name?: string;
  symbol?: string;
  uri?: string;
  imageUrl?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

export interface EnrichedToken extends TokenEvent {
  features: TokenFeatures;
}

export interface TokenFeatures {
  mintAuthorityActive: boolean;
  freezeAuthorityActive: boolean;
  lpBurned: boolean;
  top10HoldersPct: number;
  uniqueHolders: number;
  bundleBuyersCount: number;
  bundleBuyersPct: number;
  deployerStats: DeployerStats;
  socials: SocialSignals;
}

export interface DeployerStats {
  address: string;
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

export type FilterAction = "snipe" | "skip";

export interface FilterDecision {
  action: FilterAction;
  score: number;
  reason: string;
}

// position lifecycle is open until tp ladder fully consumed or sl hit
export interface Position {
  mint: string;
  pool: string;
  entryPriceSol: number;
  amountTokens: number; // raw token units, not ui-adjusted
  amountSolSpent: number;
  openedAt: number;
  highestMultiplier: number;
  realizedSol: number;
  status: "open" | "closing" | "closed";
  tpHit: number[];
}
