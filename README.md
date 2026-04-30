<div align="center">

<img src="assets/bannernaomi.png" alt="naomi — autonomous agent scanner on solana" width="100%" />

watches every pump.fun and raydium-launchpad launch · snapshots the first 60 seconds · scores with claude · no trading, just verdicts

[![npm](https://img.shields.io/npm/v/naomi-scanner.svg?color=cb3837&label=npm)](https://www.npmjs.com/package/naomi-scanner)
[![npm downloads](https://img.shields.io/npm/dm/naomi-scanner.svg?color=cb3837)](https://www.npmjs.com/package/naomi-scanner)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Language](https://img.shields.io/badge/lang-typescript-3178c6.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933.svg)](https://nodejs.org/)
[![CI](https://github.com/neomiagent/naomi/actions/workflows/ci.yml/badge.svg)](https://github.com/neomiagent/naomi/actions/workflows/ci.yml)
[![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[![Solana](https://img.shields.io/badge/chain-solana-9945ff.svg)](https://solana.com)
[![pump.fun](https://img.shields.io/badge/source-pump.fun-00d18c.svg)]()
[![raydium](https://img.shields.io/badge/source-raydium--launchpad-c200fb.svg)]()
[![jito](https://img.shields.io/badge/attribution-jito%20bundles-000000.svg)]()

---

[**what she does**](#what-she-does) ·
[**how it works**](#how-it-works) ·
[**heuristics**](#detection-heuristics) ·
[**quickstart**](#quickstart) ·
[**config**](#config) ·
[**roadmap**](#roadmap)

</div>

---

## what she does

naomi is an autonomous **forensic** analyzer for solana token launches. open source, mit-licensed. she does three things, in order:

1. **listens** to new token creations on pump.fun and raydium-launchpad in real time.
2. **snapshots** the first 60 seconds of each token's life: distinct buyers, jito-tagged bundles, sniper pubkeys, dev self-buy, holder concentration after the window.
3. **scores** the snapshot with claude and emits a verdict: alert, watch, or ignore.

naomi does not trade. she does not hold keys. she watches and reports. plug her into a stdout console, an append-only jsonl log, or a webhook for your alert pipeline.

the load-bearing change in v0.2 is the **first 60 seconds** scope. the eth-era naomi reported on a token at the moment its pair was created. the solana naomi reports on a token after she has watched a minute of its life.

## how it works

```
   pump.fun stream     raydium-launchpad stream     geyser stream
        |                       |                          |
        +----------+------------+--------+-----------------+
                              |
                              v
                          enricher
        mint authority · mint meta · liquidity · holders · deployer · socials · first 60s
                              |
                              v
                           filter
                heuristics + claude scoring
                              |
                              v
                            sinks
              stdout · jsonl · webhook
```

the edge is verdict quality, not millisecond speed. naomi is meant to be slower than a sniper and more accurate than a scoreboard.

## supported sources

| source                              | status   | notes |
|-------------------------------------|----------|-------|
| pump.fun token creation             | 🟢 primary | program log subscription on `6EF8...wF6P` |
| raydium-launchpad initialize/createPool | 🟢 primary | program log subscription on `LanM...J3uj` |
| raydium amm v4 post-graduation pools | ⚪ stub   | watching for migrations from launchpad |
| geyser / yellowstone-grpc           | 🟡 stub   | wired in v0.3 once a stable ts client lands |

## detection heuristics

| feature                   | what it catches                                                | status |
|---------------------------|----------------------------------------------------------------|--------|
| mint authority            | mint or freeze authority not renounced → ongoing rug surface   | 🟢 v0.2 |
| mint metadata             | decimals, supply, mutable metaplex meta                        | 🟡 v0.2 |
| liquidity / bonded pct    | bonding-curve sol balance, graduation tracking                 | 🟡 v0.2 |
| top 10 holders            | one wallet sells, you bag-hold                                 | 🟡 v0.2 |
| deployer history          | repeat offender: prior tokens deployed, wallet age             | 🟡 v0.2 |
| social signals            | twitter / telegram / website from metaplex meta                | 🟡 v0.2 |
| **first 60 seconds**      | unique buyers, jito-bundle dominance, sniper pubkeys, dev self-buy | 🟡 v0.2 |
| ai score                  | claude reads the full feature set, returns verdict             | 🟢 v0.2 |

## quickstart

install from npm:

```bash
npm install -g naomi-scanner
# or one-shot:
npx naomi-scanner
```

or from source:

```bash
git clone https://github.com/neomiagent/naomi.git
cd naomi
npm install
cp .env.example .env
cp config.example.yaml config.yaml
# fill in .env: SOL_RPC_URL, HELIUS_API_KEY, ANTHROPIC_API_KEY (optional)

npm run scan
```

stdout will start emitting verdicts as new tokens are created on pump.fun and raydium-launchpad. naomi never signs a transaction; she only reads.

## sample output

```
[ALERT] $WIF EPjFWdd5...kZwyTDt1v
      score=82 liq=4.30sol top10=18% buyers60s=24 src=pumpfun
      lp/curve healthy, authorities renounced, broad first-60s buyers, no jito dominance

[WATCH] $TROLL 5fBp...K1m
      score=51 liq=1.80sol top10=42% buyers60s=11 src=raydium_launchpad [no_socials]
      yellow: metaplex update authority active, no socials

[IGNORE] $RUG 7Hz...QqA
      score=4 liq=0.20sol top10=88% buyers60s=2 src=pumpfun [dev_self_bought,top10_concentrated]
      blocked: dev self-bought twice in first 60s, top wallet holds 88%
```

## config

`config.yaml` controls filter strictness, sources, ai, and output sinks. `.env` holds endpoints and api keys. naomi reads no keys from anywhere else.

```yaml
filter:
  min_score: 0.2
  alert_score: 0.7
  reject:
    mint_authority_not_renounced: true
    freeze_authority_not_renounced: true
    metadata_mutable: false
    bonded_pct_below: 0
    top10_holders_pct_above: 70
    min_liquidity_sol: 5.0
    first60s_unique_buyers_below: 3
    dev_self_bought: true

sources:
  pumpfun: true
  raydium_launchpad: true
  raydium_amm: false
  geyser: false

ai:
  enabled: true
  prompt_cache: true

output:
  stdout: true
  jsonl_path: data/analyzed.jsonl
  webhook_url:
  webhook_min_verdict: watch
```

see [`config.example.yaml`](config.example.yaml) for the full reference.

## architecture

```
src/
  index.ts              entrypoint and pipeline wiring
  config.ts             env and yaml loaders, zod-validated
  types.ts              shared types (TokenEvent, EnrichedToken, FilterDecision)
  listener/
    pumpfun.ts          program log subscription on pump.fun
    raydium_launchpad.ts  program log subscription on raydium launchpad
    geyser.ts           yellowstone-grpc / shredstream stub
  enricher/
    index.ts            parallel feature fetch
    mint_authority.ts   mint + freeze authority renunciation check
    mint_meta.ts        decimals, supply, metaplex metadata
    liquidity.ts        bonding-curve / pool reserves and bonded pct
    holders.ts          total holders, top10 concentration, first-slot count
    deployer.ts         prior tokens deployed, wallet age, balance at create
    socials.ts          twitter, telegram, website from metaplex
    first_60s.ts        the new scope tweak: 60s post-launch snapshot
  ai/
    filter.ts           claude verdict, prompt-cached system, solana semantics
  output/
    stdout.ts           colorized terminal verdicts
    jsonl.ts            one analyzed token per line, durable
    webhook.ts          POST verdicts above a configurable threshold
docs/
  ARCHITECTURE.md       deep dive
```

owners:

| zone | owners |
|---|---|
| core, config, ci, docs | @neomiagent |
| listeners (pumpfun, raydium-launchpad, geyser) | @0xnova |
| enricher, ai filter, scoring, first-60s | @senri |
| types, output sinks, cli | @kira |

## what naomi is not

- not a trading bot. she has no executor, no wallet, no signer. by design.
- not financial advice. verdicts are decision support, not commands.
- not a guarantee. authorities can be revoked post-launch, metaplex meta can flip, ai is wrong sometimes. read the flags.
- not multi-chain in this repo. solana mainnet only. the eth-era code lives at the v0.1.x tag — fork it under MIT if you want to keep that line alive.

<!-- keep roadmap dates honest, revise when reality changes -->

## roadmap

| version | scope                                                                          | status |
|---------|--------------------------------------------------------------------------------|--------|
| v0.1    | (eth era) uniswap v2/v3 + mempool listeners, honeypot/contract/lp enrichers     | archived |
| v0.2    | chain pivot to solana. pump.fun + raydium-launchpad listeners. first-60s snapshot. solana-shaped enrichers. claude prompt rewritten. | shipped |
| v0.3    | real geyser / yellowstone-grpc subscriber. helius enhanced-tx for first-60s and holders. metaplex metadata fetch. fixture replay. | now |
| v0.4    | meteora dlmm + raydium-clmm post-graduation tracking. discord webhook helper. historical replay mode. | planned |
| v0.5    | sniper-ring clustering (cross-token co-occurrence of buyer pubkeys). leaderboard. weekly digest. | planned |

## contributing

prs welcome. read [`CONTRIBUTING.md`](CONTRIBUTING.md) first. good first contributions:

- wire a real geyser subscription in `src/listener/geyser.ts` (helius hosted grpc is the easiest start)
- implement `snapshotFirst60s` against helius enhanced-tx parsed-instructions endpoint
- add a metaplex metadata fetch in `src/enricher/mint_meta.ts`
- add a discord webhook formatter alongside the generic webhook sink
- add unit tests for the ai filter parser and the heuristic-only path

if you find a security issue, see [`SECURITY.md`](SECURITY.md). do not open a public issue.

## license

mit. see [`LICENSE`](LICENSE).

## acknowledgements

solana, pump.fun, raydium, jito, helius, anthropic. the open-source ecosystem below the application layer is what makes this small.

---

<div align="center">

built in public. if it's not in the repo, it doesn't exist.

v0.1.0 shipped 2026-04-25 (eth era). v0.2.0 shipped 2026-04-30 (chain pivot to solana).

</div>
<!-- two install paths: npm and source -->
