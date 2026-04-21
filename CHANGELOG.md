# changelog

all notable changes to this project are documented here. format follows [keep a changelog](https://keepachangelog.com/), versioning follows [semver](https://semver.org/).

## [unreleased]

### added
- raydium migration listener scaffold
- deployer-history cache interface (in-memory backend)
- prompt cache flag for the claude filter

### changed
- bundle clustering now considers funding source within the last 50 slots
- `config.yaml` reject section is exhaustive by default

### fixed
- filter parser handled malformed json from the model (returns skip + reason)

## [0.1.0] - 2026-04-22

first tagged version. core pipeline runs end to end in paper mode.

### added
- pump.fun create-event listener scaffold
- enricher with holders, bundle, deployer, social signals
- ai filter via claude with prompt cache support
- jito bundle submission helper
- position manager skeleton with tp ladder, sl, trailing stop config
- `.env.example` and `config.example.yaml`
- mit license, contributing guide, security policy
- ci pipeline with typecheck and build

### known limitations
- listener and executor are stubs. transports must be implemented before live trading.
- deployer history cache is in memory only.
- meteora dlmm coverage is planned, not shipped.
