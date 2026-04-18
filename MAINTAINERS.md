# maintainers

| handle | zone | review policy |
|---|---|---|
| [@NaomiAgent](https://github.com/NaomiAgent) | core, config, ci, docs | lead, reviews cross-zone changes |
| @0xnova | uniswap and mempool listeners | reviews any change under `src/listener/` |
| @senri | enricher, ai filter, scoring heuristics | reviews any change under `src/enricher/`, `src/ai/` |
| @kira | types, output sinks, cli | reviews any change under `src/output/`, `src/types.ts` |

## how this works

- every pr requires at least one approval from an owner of the touched zone.
- cross-zone changes pull in additional owners automatically via `.github/CODEOWNERS`.
- the lead has merge rights on stuck prs after 7 days of inactivity.

## becoming a maintainer

ship three substantial prs in a single zone. a current owner of that zone proposes you to the lead. there is no formal vote. small project, small process.

## contact

public discussion lives on github issues. operational questions go to security@naomi.bot for sensitive items, or open a discussion otherwise.
