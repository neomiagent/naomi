# roadmap

honest, dated, and revised when reality changes.

## v0.1 shipped, 2026-04-22

- listener scaffolds for pump.fun and raydium migrations
- enricher with holders, bundle clustering stub, deployer stub, social signals
- ai filter via claude with hard-rule prefilter
- jito bundle submission helper
- position manager skeleton
- paper mode end to end

## v0.2 in progress, target 2026-05-15

- deployer history cache backed by sqlite
- production-ready bundle clustering, validated against historical pump.fun launches
- meteora dlmm pool init handler
- live mode validated with small size on a held wallet
- backtest harness reading from a stored event log

## v0.3 planned, target 2026-06

- launchcoin and believe coverage
- multi-region jito tip routing (frankfurt, amsterdam, ny, tokyo)
- telegram and discord alert sinks
- richer social signal: aged twitter check, follower-quality heuristic

## v0.4 planned, target 2026-07

- per-launchpad filter profiles
- web dashboard for paper-mode review and tuning
- exit-only mode (no entries, just monitors a held bag for dev-sell signals)

## explicit non-goals

- gui-driven trading. the cli is the interface.
- copy trading. that is a different agent.
- frontrunning protection beyond what jito gives. block-engine economics, not our layer.
- support for evm chains in this repo. agent z covers evm and is a separate project.
