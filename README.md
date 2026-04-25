<div align="center">

```
███╗   ██╗ █████╗  ██████╗ ███╗   ███╗██╗
████╗  ██║██╔══██╗██╔═══██╗████╗ ████║██║
██╔██╗ ██║███████║██║   ██║██╔████╔██║██║
██║╚██╗██║██╔══██║██║   ██║██║╚██╔╝██║██║
██║ ╚████║██║  ██║╚██████╔╝██║ ╚═╝ ██║██║
╚═╝  ╚═══╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝
```

### ai-filtered solana sniper agent
listens to pump.fun and dex migrations · scores with claude · enters with jito

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Language](https://img.shields.io/badge/lang-typescript-3178c6.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933.svg)](https://nodejs.org/)
[![CI](https://github.com/NaomiAgent/naomi/actions/workflows/ci.yml/badge.svg)](https://github.com/NaomiAgent/naomi/actions/workflows/ci.yml)
[![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[![Solana](https://img.shields.io/badge/chain-solana-9945FF.svg)](https://solana.com)
[![pump.fun](https://img.shields.io/badge/source-pump.fun-ff69b4.svg)](https://pump.fun)
[![Jito](https://img.shields.io/badge/exec-jito%20bundles-orange.svg)](https://jito.wtf)
[![Claude](https://img.shields.io/badge/ai-claude-d97706.svg)](https://www.anthropic.com)

---

[**what she does**](#what-she-does) ·
[**how it works**](#how-it-works) ·
[**quickstart**](#quickstart) ·
[**config**](#config) ·
[**roadmap**](#roadmap)

</div>

---

## what she does

naomi is a sniper agent for solana memecoins. open source, mit-licensed. she does three things, in order:

1. **listens** to new launches on pump.fun and dex migrations in real time.
2. **scores** each token with deterministic on-chain filters and an ai pass through claude.
3. **enters** the ones that pass via jito bundles, with tp ladder, stop loss, and dev-sell exit.

most snipers race on speed alone. naomi races on quality. the edge is in the filter, not the millisecond.

## how it works

```
   pump.fun stream         dex migration stream
        |                          |
        +------------+-------------+
                     |
                     v
                 enricher
        holders, bundle, deployer, socials
                     |
                     v
                  filters
          hard rules, then ai score
                     |
                     v
                 executor
              jito bundle, signed
                     |
                     v
              position manager
       tp ladder, sl, trailing, dev-sell exit
```

latency budget: from event to bundle submission, under 1500 ms.

## supported sources

| source | status | notes |
|---|---|---|
| pump.fun | 🟢 primary | bonding-curve creates and mid-curve buys |
| raydium migrations | 🟡 ready | amm and clmm pool inits |
| meteora dlmm | ⚪ stub | listener scaffold present |
| launchcoin / believe | ⚪ planned | v0.3 |

## detection heuristics

| feature | what it catches | status |
|---|---|---|
| mint and freeze authority active | rug vector, can mint to drain | 🟢 v0.1 |
| top 10 holders concentration | one wallet sells, you bag-hold | 🟢 v0.1 |
| launch bundle clustering | dev funded n wallets, fake organic interest | 🟢 v0.1 |
| deployer history | rug ratio across prior launches | 🟡 v0.2 |
| social signal | aged twitter, real telegram, vs zero presence | 🟡 v0.2 |
| ai score | claude reads the full feature set | 🟢 v0.1 |

## quickstart

```bash
git clone https://github.com/NaomiAgent/naomi.git
cd naomi
npm install
cp .env.example .env
cp config.example.yaml config.yaml
# fill in .env: SOLANA_RPC_URL, WALLET_PRIVATE_KEY, JITO_BLOCK_ENGINE_URL, ANTHROPIC_API_KEY

# paper mode: log decisions, no transactions
npm run paper

# live mode: real buys via jito (use a dedicated hot wallet, fund only what you can lose)
npm run live
```

paper mode is the default. it will not sign or submit any transaction. tune your filter on paper for a few days before flipping to live.

## config

`config.yaml` controls risk, filter strictness, execution, and tp ladder. `.env` holds endpoints and the wallet key. naomi never reads keys from anywhere else.

```yaml
risk:
  per_trade_sol: 0.5
  max_concurrent: 5
  bankroll_cap_sol: 5.0

filter:
  min_score: 0.7
  reject:
    mint_authority_active: true
    freeze_authority_active: true
    top10_holders_pct_above: 70
    bundle_buyers_above: 8

position:
  tp_ladder:
    - [2.0, 0.5]
    - [5.0, 0.3]
    - [10.0, 0.2]
  stop_loss_pct: -50
  trailing_stop_after_multiplier: 3.0
```

see [`config.example.yaml`](config.example.yaml) for the full reference.

## architecture

```
src/
  index.ts              entrypoint and pipeline wiring
  config.ts             env and yaml loaders, zod-validated
  types.ts              shared types
  listener/
    pumpfun.ts          pump.fun create and migration events
    raydium.ts          raydium amm and clmm pool inits
  enricher/
    index.ts            parallel feature fetch
    holders.ts          authority flags, top-10 concentration
    bundle.ts           launch-bundle clustering
    deployer.ts         deployer history and rug ratio
  ai/
    filter.ts           claude scoring with prompt cache
  executor/
    buy.ts              build and sign buy tx
    jito.ts             bundle submission
  position/
    manager.ts          tp ladder, sl, trailing, dev-sell exit
docs/
  ARCHITECTURE.md       deep dive
```

owners:

| zone | owners |
|---|---|
| core, config, ci, docs | @NaomiAgent |
| solana ingest, executor, jito | @0xnova |
| ai filter, scoring | @senri |
| types, position manager, cli | @kira |

## modes

- **paper** is the default. listeners and filters run, decisions are logged, no transactions are signed or sent. use this to tune your filter without burning capital.
- **live** runs the full pipeline. requires `WALLET_PRIVATE_KEY`, `JITO_BLOCK_ENGINE_URL`, and a paid rpc.

## what naomi is not

- not financial advice. she is a tool, not an oracle.
- not a guarantee. ai scores can be wrong. the hard filters are your real safety net.
- not for a treasury. fund the hot wallet with what you can afford to lose.
- not a one-click winner. paper mode for a week, then small size for a week, then scale.

<!-- keep roadmap dates honest, revise when reality changes -->

## roadmap

| version | scope | status |
|---|---|---|
| v0.1 | listener scaffolds, enricher, ai filter, paper mode | 🟢 shipped |
| v0.2 | deployer history cache, raydium migration parser, position manager | 🛠️ in progress |
| v0.3 | launchcoin and believe coverage, multi-region jito, telegram alerts | ⏳ planned |
| v0.4 | per-launchpad filter profiles, backtest harness, web dashboard | ⏳ planned |

## contributing

prs welcome. read [`CONTRIBUTING.md`](CONTRIBUTING.md) first. good first contributions:

- add a new launch source under `src/listener/`
- improve bundle-clustering accuracy in `src/enricher/bundle.ts`
- add a deployer cache backend (sqlite, postgres) behind the existing interface
- write unit tests for the ai filter parser

if you find a security issue, see [`SECURITY.md`](SECURITY.md). do not open a public issue.

## license

mit. see [`LICENSE`](LICENSE).

## acknowledgements

solana, pump.fun, jito labs, anthropic. the open-source community around solana tooling makes everything below the application layer possible.

---

<div align="center">

built in public. if it's not in the repo, it doesn't exist.

v0.1.0 shipped 2026-04-22. v0.2 in progress.

</div>
