# Architecture

```
   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
   │ uniswap v2 logs  │  │ uniswap v3 logs  │  │  mempool stream  │
   └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
            │                     │                     │
            └─────────────────┬───┴─────────────────────┘
                              │   TokenEvent
                         ┌────▼─────┐
                         │ enricher │
                         └────┬─────┘
                              │   honeypot · contract · liquidity
                              │   holders · deployer · socials
                              │
                              │   EnrichedToken
                         ┌────▼─────┐
                         │  filter  │   heuristics → claude score
                         └────┬─────┘
                              │   FilterDecision
                              │   (verdict + score + flags + reason)
                         ┌────▼─────┐
                         │  sinks   │   stdout · jsonl · webhook
                         └──────────┘
```

## Latency budget

Naomi is an analyzer, not a sniper. There is no latency-driven correctness
constraint. Verdicts that arrive seconds after the launch are still useful
because the consumer is a human (or a webhook posting into a chat) deciding
whether to investigate further.

That said, the pipeline is parallel and aims to produce a verdict within a
few seconds end to end:

| stage      | budget | notes                                                |
|------------|-------:|------------------------------------------------------|
| listener   |  ~50ms | viem watchEvent log decode                           |
| enricher   |  ~2 s  | parallel etherscan + rpc calls; bottleneck is etherscan rate limits |
| ai filter  | ~600ms | claude haiku with prompt cache; falls back to heuristics if unset |
| sinks      | ~50ms  | stdout immediate, jsonl append, webhook fire-and-log |

## Inputs

- `ETH_RPC_URL` — required. Use a paid provider (Alchemy, QuickNode, Infura).
- `ETH_WS_URL` — optional unless mempool source is enabled.
- `ETHERSCAN_API_KEY` — optional. Without it, contract verification and
  holder distribution degrade to "unknown" and downstream filters abstain.
- `ANTHROPIC_API_KEY` — optional. Without it, Naomi runs heuristic-only.

## Outputs

- **stdout** — colorized one-token-per-block format, useful in a tmux pane
  or a tail-style monitor.
- **jsonl** — one analyzed token per line, durable. The full feature set
  and verdict are serialized so the file is replayable.
- **webhook** — POST the full analyzed token (json) to a configured URL,
  filtered by minimum verdict.

## Extending

- Add a new source: implement a function in `src/listener/` that emits
  `TokenEvent`, register it in `src/index.ts` behind a `sources.<name>`
  config flag.
- Swap the ai model: implement `runFilter(token, env, config, logger)` with
  the same signature in `src/ai/`.
- Add a new sink: write a function `(analyzed, logger) => Promise<void>` in
  `src/output/` and wire it into the handler in `src/index.ts`.
- Persist deployer history: replace the in-memory cache in
  `src/enricher/deployer.ts` with sqlite or postgres behind the same
  function signatures.

## What naomi does not do

- No transactions. The agent has no signer and no wallet integration. It is
  a read-only analyzer.
- No automated trading. By design. If you fork her into a sniper, that is
  your own project.
- No multichain in this repo. Ethereum mainnet only. Other evm chains
  belong in forks.
