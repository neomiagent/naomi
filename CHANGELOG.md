# changelog

all notable changes to this project are documented here. format follows [keep a changelog](https://keepachangelog.com/), versioning follows [semver](https://semver.org/).

## [unreleased]

### added
- mempool listener stub (alchemy_pendingTransactions wiring TODO)
- deployer-history cache interface (in-memory backend)
- prompt cache flag for the claude verdict prompt
- webhook sink with configurable minimum verdict

### changed
- contract check treats `owner()` revert as "non-ownable / renounced"
- jsonl sink serializes bigint via custom replacer

### fixed
- filter parser handles malformed json from the model (returns ignore + reason)

## [0.1.0] - 2026-04-25

first tagged version. core analyzer pipeline runs end to end.

### added
- uniswap v2 PairCreated listener via viem
- uniswap v3 PoolCreated listener via viem
- enricher: honeypot stub, contract flags via etherscan, liquidity weth check, lp lock detection, top10 holders, deployer history
- ai verdict via claude with prompt-cache support, heuristic-only fallback
- output sinks: stdout, jsonl, webhook
- `.env.example` and `config.example.yaml`
- mit license, contributing guide, security policy
- ci pipeline with typecheck and build on node 20 and 22

### known limitations
- honeypot simulation is a stub. real eth_call state-override traces are TODO.
- deployer history cache is in memory only.
- mempool source has no decoder yet, only a placeholder.
- holder distribution requires etherscan pro tier.
<!-- v0.1.0 — listener, enricher, ai, sinks -->
