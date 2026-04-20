# roadmap

honest, dated, and revised when reality changes.

## v0.1 shipped, 2026-04-25

- uniswap v2 and v3 factory log listeners
- enricher: honeypot stub, contract flags, liquidity, holders, deployer, socials
- ai verdict via claude with prompt cache, heuristic-only fallback
- stdout, jsonl, webhook output sinks
- ci on node 20 and 22

## v0.2 in progress, target 2026-05-20

- full honeypot eth_call simulation with state overrides (real buy/sell trace)
- deployer history cache backed by sqlite
- mempool listener wired to alchemy_pendingTransactions, decode addLiquidityETH
- holder distribution fallback for accounts without etherscan pro
- replay mode that reads a jsonl log and re-scores tokens

## v0.3 planned, target 2026-06

- aged-twitter age and follower-quality check
- discord webhook formatter (embed, color by verdict)
- telegram bot bridge so verdicts flow into a channel
- per-source filter profiles (different thresholds for v2 vs v3)

## v0.4 planned, target 2026-07

- verdict accuracy metrics: track outcomes 24h after launch, score the scorer
- web dashboard for jsonl log review and threshold tuning
- "watch list" mode that re-scores held tokens on new events

## explicit non-goals

- trading. naomi has no executor by design. she watches and reports.
- holding keys. no wallet, no signer, no private key handling.
- multichain in this repo. ethereum mainnet only. fork for other evm chains.
- copy trading or alpha distribution. that is a different agent.
<!-- v0.2 trace impl started -->
