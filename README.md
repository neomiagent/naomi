<div align="center">

<img src="assets/bannernaomi.jpg" alt="naomi — autonomous agent scanner on ethereum" width="100%" />

listens to new token launches · runs honeypot and contract checks · scores with claude · no trading, just verdicts

[![npm](https://img.shields.io/npm/v/naomi-scanner.svg?color=cb3837&label=npm)](https://www.npmjs.com/package/naomi-scanner)
[![npm downloads](https://img.shields.io/npm/dm/naomi-scanner.svg?color=cb3837)](https://www.npmjs.com/package/naomi-scanner)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Language](https://img.shields.io/badge/lang-typescript-3178c6.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933.svg)](https://nodejs.org/)
[![CI](https://github.com/NaomiAgent/naomi/actions/workflows/ci.yml/badge.svg)](https://github.com/NaomiAgent/naomi/actions/workflows/ci.yml)
[![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Twitter](https://img.shields.io/badge/x-@NaomiOnEth-000000.svg)](https://x.com/NaomiOnEth)

[![Ethereum](https://img.shields.io/badge/chain-ethereum-627eea.svg)](https://ethereum.org)
[![Uniswap](https://img.shields.io/badge/source-uniswap-ff007a.svg)](https://uniswap.org)
[![viem](https://img.shields.io/badge/lib-viem-1c1c1c.svg)](https://viem.sh)
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

naomi is an autonomous agent scanner for ethereum token launches. open source, mit-licensed. she does three things, in order:

1. **listens** to new pair and pool creations on uniswap v2, v3, and the mempool in real time.
2. **enriches** every token with honeypot simulation, contract flags, lp lock state, holder distribution, and deployer history.
3. **scores** the snapshot with claude and emits a verdict: alert, watch, or ignore.

naomi does not trade. she does not hold keys. she watches and reports. plug her into a stdout console, an append-only jsonl log, or a webhook for your alert pipeline.

## how it works

```
   uniswap v2 stream     uniswap v3 stream     mempool stream
        |                       |                    |
        +----------+------------+--------+-----------+
                              |
                              v
                          enricher
        honeypot · contract · liquidity · holders · deployer · socials
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

| source | status | notes |
|---|---|---|
| uniswap v2 `PairCreated` | 🟢 primary | factory log subscription |
| uniswap v3 `PoolCreated` | 🟢 primary | factory log subscription |
| mempool (pending tx) | ⚪ stub | needs `alchemy_pendingTransactions` or similar; ws required |

## detection heuristics

| feature | what it catches | status |
|---|---|---|
| honeypot simulation | buy passes but sell reverts → trap | 🟡 stub, eth_call wiring TODO |
| contract verification | unverified source code → unknown surface | 🟢 v0.1 |
| mint / blacklist / pause | rug vectors live in the bytecode | 🟢 v0.1 |
| ownership renounced | live owner can rotate state | 🟢 v0.1 |
| lp lock or burn | rug pull surface area zero if lp burned or locked | 🟢 v0.1 |
| top 10 holders | one wallet sells, you bag-hold | 🟢 v0.1 |
| deployer history | repeat offender, rug ratio across prior deploys | 🟡 v0.2 |
| social signals | aged twitter, real telegram, vs zero presence | 🟡 v0.2 |
| ai score | claude reads the full feature set, returns verdict | 🟢 v0.1 |

## quickstart

install from npm:

```bash
npm install -g naomi-scanner
# or one-shot:
npx naomi-scanner
```

or from source:

```bash
git clone https://github.com/NaomiAgent/naomi.git
cd naomi
npm install
cp .env.example .env
cp config.example.yaml config.yaml
# fill in .env: ETH_RPC_URL, ETHERSCAN_API_KEY, ANTHROPIC_API_KEY (optional)

npm run scan
```

stdout will start emitting verdicts as new pairs and pools are created on mainnet. naomi never signs a transaction; she only reads.

## sample output

```
[ALERT] $WIF 0xabc...def
      score=82 liq=4.30eth top10=18% src=uniswap_v2
      lp burned 100%, ownership renounced, no mint, clean cap table

[WATCH] $TROLL 0x123...456
      score=51 liq=1.80eth top10=42% src=uniswap_v3 [unverified]
      yellow: contract unverified, deployer unknown

[IGNORE] $RUG 0x789...abc
      score=4 liq=0.20eth top10=88% src=uniswap_v2 [honeypot,top10_concentrated]
      blocked: sell tax 100%, top wallet holds 88% post-launch
```

## config

`config.yaml` controls filter strictness, sources, ai, and output sinks. `.env` holds endpoints and api keys. naomi reads no keys from anywhere else.

```yaml
filter:
  min_score: 0.2
  alert_score: 0.7
  reject:
    honeypot: true
    mint_function_present: true
    blacklist_function_present: true
    top10_holders_pct_above: 70
    min_liquidity_eth: 0.5

sources:
  uniswap_v2: true
  uniswap_v3: true
  mempool: false

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
    uniswap_v2.ts       PairCreated factory subscription
    uniswap_v3.ts       PoolCreated factory subscription
    mempool.ts          pending-tx liquidity-add filter (stub)
  enricher/
    index.ts            parallel feature fetch
    honeypot.ts         eth_call buy/sell simulation
    contract.ts         verified, renounced, mint/pause/blacklist flags
    liquidity.ts        weth-in-pool, lp lock, lp burn %
    holders.ts          unique holders, top10 concentration
    deployer.ts         prior deploys and rug ratio
    socials.ts          twitter, telegram presence
  ai/
    filter.ts           claude verdict, prompt-cached system
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
| core, config, ci, docs | @NaomiAgent |
| listeners | @0xnova |
| enricher, ai filter, scoring | @senri |
| types, output sinks, cli | @kira |

## what naomi is not

- not a trading bot. she has no executor, no wallet, no signer. by design.
- not financial advice. verdicts are decision support, not commands.
- not a guarantee. honeypots evolve, contracts upgrade, ai is wrong sometimes. read the flags.
- not multichain in this repo. ethereum mainnet only. if you need other evm chains, fork her.

<!-- keep roadmap dates honest, revise when reality changes -->

## roadmap

| version | scope | status |
|---|---|---|
| v0.1 | listener scaffolds, enricher, ai verdict, stdout/jsonl/webhook sinks | 🟢 shipped |
| v0.2 | full honeypot eth_call simulation, deployer history sqlite cache, mempool source | 🛠️ in progress |
| v0.3 | aged-twitter check, telegram bot integration, discord webhook helper | ⏳ planned |
| v0.4 | historical replay mode, verdict accuracy metrics, web dashboard | ⏳ planned |

## contributing

prs welcome. read [`CONTRIBUTING.md`](CONTRIBUTING.md) first. good first contributions:

- wire a real `eth_call` simulation in `src/enricher/honeypot.ts`
- swap the in-memory deployer cache for sqlite behind the existing interface
- add a discord webhook formatter alongside the generic webhook sink
- add unit tests for the ai filter parser and the heuristic-only path

if you find a security issue, see [`SECURITY.md`](SECURITY.md). do not open a public issue.

## license

mit. see [`LICENSE`](LICENSE).

## acknowledgements

ethereum, uniswap, etherscan, viem, anthropic. the open-source ecosystem below the application layer is what makes this small.

---

<div align="center">

built in public. if it's not in the repo, it doesn't exist.

v0.1.0 shipped 2026-04-25. v0.2 in progress.

follow [@NaomiOnEth](https://x.com/NaomiOnEth) for updates.

</div>
<!-- two install paths now: npm and source -->
