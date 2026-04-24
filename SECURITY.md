# security policy

naomi handles a wallet private key in memory and signs transactions. a bug in the wrong place can drain funds. we take this seriously.

## scope

in scope:
- key exfiltration paths in `src/executor/` and `src/config.ts`
- transaction construction bugs that produce signed transactions a user did not authorize
- bundle bypass that lands a different mint than the one scored
- replay or signature reuse vectors
- supply-chain risk in dependencies

out of scope:
- rate limiting on rpc providers
- bugs in third-party rpcs, jito, or pump.fun themselves
- losses caused by a low ai score or a missed snipe (this is a tool, not a guarantee)

## reporting

email: security@naomi.bot

include:
- a description of the issue
- a reproduction or proof of concept
- the version or commit you tested

we acknowledge within 48 hours. for confirmed issues we coordinate disclosure and credit. please do not open a public issue.

## operational guidance for users

- use a dedicated hot wallet. fund it with only what you can lose.
- do not put the key in `.env` on a shared machine. use a secrets manager.
- set `bankroll_cap_sol` to bound exposure even if a bug bypasses `risk.per_trade_sol`.
- keep `mode=paper` for at least a week before going live.
- revoke any rpc keys or anthropic keys that touch this codebase if you suspect compromise.
