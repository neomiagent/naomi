# Architecture

```
   ┌──────────────────┐    ┌──────────────────┐
   │  pump.fun stream │    │  raydium stream  │
   └────────┬─────────┘    └────────┬─────────┘
            │                       │
            └──────────┬────────────┘
                       │   TokenEvent
                  ┌────▼─────┐
                  │ enricher │   (holders, bundle, deployer, socials)
                  └────┬─────┘
                       │   EnrichedToken
                  ┌────▼─────┐
                  │ filters  │   hard rules → AI score
                  └────┬─────┘
                       │   FilterDecision
                  ┌────▼─────┐
                  │ executor │   jito bundle
                  └────┬─────┘
                       │   BuyResult
                  ┌────▼──────────┐
                  │ position mgr  │   tp ladder, sl, trailing, dev-sell exit
                  └───────────────┘
```

## Latency budget

Total time from event detection to bundle submission target: **<1500 ms**.

| stage      | budget | notes                                   |
|------------|-------:|-----------------------------------------|
| listener   |  ~50ms | geyser → decoded event                  |
| enricher   | ~600ms | parallel rpc calls + meta fetch         |
| ai filter  | ~400ms | claude haiku, prompt cache hit          |
| executor   | ~200ms | tx build + sign                         |
| jito       | ~250ms | bundle submission, slot landing         |

## Modes

- **paper** — listeners + enricher + filter run, decisions are logged to stdout / positions log, no transactions are signed or sent. Use this to tune your filter without burning capital.
- **live** — full pipeline. Requires `WALLET_PRIVATE_KEY`, `JITO_BLOCK_ENGINE_URL`, and a paid RPC.

## Extending

- Swap the AI filter for your own model: implement `runFilter` with the same signature in `src/ai/`.
- Add new launch sources: drop a new file in `src/listener/`, emit `TokenEvent`, register in `src/index.ts`.
- Persist deployer history: replace the in-memory cache in `src/enricher/deployer.ts` with SQLite or Postgres.

## Safety notes

- Never run `live` mode with an unaudited config. Always verify on `paper` first.
- The hot wallet should hold only the bankroll cap. Keep your treasury separate.
- AI scores can be wrong. Hard filters (`config.filter.reject`) are your real safety net.
