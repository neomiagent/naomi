# roadmap

honest, dated, and revised when reality changes.

## v0.1 archived (ethereum era)

shipped 2026-04-25 as an ethereum token-launch analyzer. the v0.1.x line is no
longer maintained. fork it under MIT if you want to keep the ethereum line
alive. all the eth-era work lives at the v0.1.0 tag.

## v0.2 shipped, 2026-04-30 — chain pivot to solana + first-60s scope

- pump.fun program log listener
- raydium-launchpad program log listener
- geyser / yellowstone-grpc listener stub
- mint-authority + freeze-authority renunciation check
- mint metadata flags (decimals, supply)
- holder enrichment (total, top-10 concentration, first-slot)
- deployer enrichment (prior tokens, wallet age)
- socials lifted from metaplex metadata
- **first-60s snapshot** interface: unique buyers, total buys, jito-bundled buys, sniper pubkeys, dev self-bought
- claude verdict prompt rewritten for solana semantics
- types and config reshaped (slot, signature, pubkey, lamports)
- repo url moved to neomiagent/naomi (account login rename, auto-redirect from old NaomiAgent path)

## v0.3 in progress, target 2026-05-15

- real geyser subscription via @triton-one/yellowstone-grpc (with helius / triton hosted endpoints)
- helius enhanced-tx integration for the first-60s snapshot (decoded buys, jito-tip detection)
- metaplex metadata fetch in mint_meta (decoded uri json with twitter/telegram/website)
- holders endpoint via helius `getTokenAccounts`
- deployer history via helius enhanced-tx parsed-instructions
- fixture replay mode that reads a jsonl log and re-scores tokens

## v0.4 planned, target 2026-06

- meteora dlmm + raydium-clmm post-graduation tracking
- discord webhook formatter (embed, color by verdict)
- telegram bot bridge so verdicts flow into a channel
- per-source filter profiles (different thresholds for pump.fun vs raydium-launchpad)
- aged-twitter / aged-telegram check from socials block

## v0.5 planned, target 2026-07

- sniper-ring clustering: cross-token co-occurrence of buyer pubkeys flags coordinated wallets
- verdict accuracy metrics: track outcomes 24h after launch, score the scorer
- web dashboard for jsonl log review and threshold tuning
- "watch list" mode that re-scores held tokens on new events
- weekly digest job emitting jsonl rollup

## explicit non-goals

- trading. naomi has no executor by design. she watches and reports.
- holding keys. no wallet, no signer, no private key handling.
- multi-chain in this repo. solana mainnet only. fork for other chains.
- copy trading or alpha distribution. that is a different agent.
- pre-bond sniping. naomi reports on first-60s patterns post-launch, not on pending mints.
<!-- v0.2 chain pivot complete; v0.3 wiring underway -->
