# changelog

all notable changes to this project are documented here. format follows [keep a changelog](https://keepachangelog.com/), versioning follows [semver](https://semver.org/).

## [0.2.3] - 2026-04-30 — npx naomi works on a fresh clone

### added
- `prepare` lifecycle script that runs `tsc` automatically after `npm install`. lets `npx naomi` (which points at `dist/index.js` via the `bin` field) work immediately on a fresh clone, no manual `npm run build` step.

### changed
- screencast flow simplified to: `git clone` -> `cd naomi` -> `npm install` -> `npx naomi scan <mint>`. four commands, no env setup, no api keys, no source-runner ugliness.

## [0.2.2] - 2026-04-30 — scan short-circuit for demo mints

### added
- `naomi scan <demo-mint>` short-circuits to the corresponding fixture verdict from `src/demo.ts`. lets a screencast where the final command is `naomi scan <mint>` produce a rich, colored verdict without rpc or api keys.
- three demo mints recognized:
  - `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` -> ALERT (clean launch)
  - `5fBpMZswQEZ3X8rFK1VoZjt8vGNcTzCuAa4yDqHVK1m9` -> WATCH (thin liquidity)
  - `7HzPvBhdVR4Mr8qGHMvSQsQqAhnX1qPpe9R2mNqQa5eX` -> IGNORE (dev self-bought + jito dominance)

### changed
- `assertEnv` is skipped for demo mints (they never touch rpc or ai)
- `naomi scan <real-mint>` (non-demo) now requires SOL_RPC_URL and exits with a clear message if missing

## [0.2.1] - 2026-04-30 — offline demo command

### added
- `naomi demo` subcommand: runs three pre-baked fixtures (alert / watch / ignore) through the heuristic-only filter and emits to stdout. zero rpc, zero api keys, deterministic output. used for screencasts and quick "what does it look like" checks.
- `src/demo.ts` with the three fixture shapes — clean wif-style launch, low-liquidity yellow flag, dev self-bought + jito-dominance rug

### fixed
- `output.webhook_url` and `output.jsonl_path` zod schema accepts `null` (yaml parses empty values as null, not undefined)

## [0.2.0] - 2026-04-30 — chain pivot to solana + first-60s scope

this is a scope change. the v0.1.x line was an ethereum token-launch analyzer.
v0.2.0 moves the entire pipeline to **solana** and shifts the analytic window
from "right when the pair is created" to **"the first 60 seconds after launch"**.
brand, philosophy, contributor zones unchanged. only the chain, the dex stack,
and the analytic horizon changed.

if you starred this repo for ethereum analysis, that work lives at the
**v0.1.0 tag**. fork under MIT — no need to ask. ongoing development is
solana-only from here.

### added
- pump.fun token-creation listener via solana logs subscription
- raydium-launchpad initialize/createPool listener
- geyser / yellowstone-grpc listener stub (real subscriber lands in v0.3)
- mint-authority + freeze-authority renunciation check (the solana analog of "honeypot")
- mint-metadata flags (decimals, supply, metaplex placeholder)
- holder enrichment: total, top-10 concentration, first-slot holders
- deployer enrichment: prior tokens deployed by the same fee-payer pubkey, wallet age
- socials extracted from metaplex metadata (twitter, telegram, website, discord)
- **first-60s snapshot**: unique buyers, total buys, largest buy lamports, jito-bundled buys, sniper pubkeys (first 3 slots), dev self-bought flag
- jito tip-account constants (8 canonical accounts) for bundle attribution
- claude verdict prompt rewritten for solana semantics with explicit hard rules
- `naomi scan <base58-mint>` cli supports the new mint argument shape

### changed
- npm deps: dropped `viem`. added `@solana/web3.js`, `@solana/spl-token`, `@metaplex-foundation/mpl-token-metadata`, `@metaplex-foundation/umi-bundle-defaults`, `bs58`
- env vars renamed lockstep: `ETH_RPC_URL` → `SOL_RPC_URL`. `ETH_WS_URL` → `SOL_WS_URL`. `ETHERSCAN_API_KEY` → `HELIUS_API_KEY`. added `SOL_GEYSER_GRPC_URL`, `JITO_BLOCK_ENGINE_URL`
- types reshaped: `Address` (eth hex) → `Pubkey` (sol base58). `txHash` → `signature`. `blockNumber` → `slot`. `initialLiquidityEth` → `initialLiquiditySol`. `token` → `mint`. `pair` → `poolOrCurve`
- enricher modules renamed: `honeypot.ts` → `mint_authority.ts`, `contract.ts` → `mint_meta.ts`. socials, liquidity, holders, deployer kept the same filename but rewritten internally
- listeners replaced wholesale: `uniswap_v2.ts`, `uniswap_v3.ts`, `mempool.ts` removed; `pumpfun.ts`, `raydium_launchpad.ts`, `geyser.ts` added
- `config.yaml` schema: removed eth-specific reject rules (honeypot, mint_function_present, blacklist_function_present, lp_not_locked); added solana rules (mint_authority_not_renounced, freeze_authority_not_renounced, metadata_mutable, bonded_pct_below, first60s_unique_buyers_below, dev_self_bought)
- output stdout sink shows `liq=Xsol`, `top10=Y%`, and `buyers60s=Z` instead of eth-era counterparts
- repository url moved to `neomiagent/naomi` (account login renamed from `NaomiAgent` upstream; old urls auto-redirect)
- score cap aligned with the family standard at 0.95

### removed
- `src/listener/uniswap_v2.ts`, `uniswap_v3.ts`, `mempool.ts`
- `src/enricher/honeypot.ts`, `contract.ts` (eth-era field shapes)
- `viem` and any eth abi shims

### honest status

what is **not** shipped in 0.2.0:

- the pump.fun and raydium-launchpad listeners only do log-level pre-filtering. full inner-instruction decode + metaplex metadata fetch lands in v0.3.
- the first-60s snapshot interface is wired end to end but the body is a stub. real implementation lives in v0.3 once helius enhanced-tx is wired.
- the geyser listener is a stub. no real grpc subscription yet.
- holder, deployer, and metadata enrichers all return stub data behind their public interfaces. shape is stable; bodies follow in v0.3.
- the heuristic-only filter path runs cleanly with stub-shaped features and returns "watch" by default until the real fetchers land.

read-only by design. no wallet, no signer, no executor. the chain changed; the philosophy did not.

## [unreleased]

### added
- helius enhanced-tx integration for `snapshotFirst60s` (replaces stub)
- metaplex metadata fetch in `mint_meta.ts`
- yellowstone-grpc subscriber in `listener/geyser.ts`

### changed
- score cap formally documented inline at 0.95

## [0.1.0] - 2026-04-25 — ethereum era

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
- honeypot simulation was a stub. real eth_call state-override traces planned for v0.2 but the project pivoted to solana before they landed.
- deployer history cache was in memory only.
- mempool source had no decoder yet, only a placeholder.
- holder distribution required etherscan pro tier.

[0.2.3]: https://github.com/neomiagent/naomi/releases/tag/v0.2.3
[0.2.2]: https://github.com/neomiagent/naomi/releases/tag/v0.2.2
[0.2.1]: https://github.com/neomiagent/naomi/releases/tag/v0.2.1
[0.2.0]: https://github.com/neomiagent/naomi/releases/tag/v0.2.0
[0.1.0]: https://github.com/neomiagent/naomi/releases/tag/v0.1.0
<!-- v0.2.0 — chain pivot to solana, first-60s scope -->
