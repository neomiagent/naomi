# contributing to naomi

prs are welcome. this file explains what to expect.

## tl;dr

1. fork, branch off `main`.
2. write the change, keep it focused.
3. run `npm run typecheck` locally before opening the pr.
4. open a pr, link the issue if one exists.
5. one of the maintainers (see `MAINTAINERS.md`) reviews within a few days.

## what we want

- new sources under `src/listener/`. each source emits a `TokenEvent`. add a feature flag in `config.yaml` under `sources.`
- better enrichment. real honeypot eth_call traces, smarter deployer history, richer social signals.
- new output sinks under `src/output/`. discord, telegram, prometheus, anything that consumes a verdict.
- tests. the ai filter parser and the heuristic-only fallback are the two highest-value targets.
- docs. fix typos, clarify `ARCHITECTURE.md`, add examples.
- ci improvements that keep the build under one minute.

## what we do not want

- a trading executor. naomi is read-only by design. forks for sniping live elsewhere.
- secrets in commits. ever. the `.gitignore` covers `.env` and `config.yaml` but double check.
- new top-level dependencies without a reason. naomi is small on purpose.
- premature optimization. the bottleneck is rpc and etherscan latency, not local compute.
- ai-generated prs without a human review. we will close them.

## style

- typescript strict mode, no `any` without a reason.
- imports use `node:` prefix for builtins.
- prefer pure functions in the enricher and filter.
- match the existing zone-of-ownership layout. if you touch `src/listener/`, flag `@0xnova`. if you touch `src/enricher/` or `src/ai/`, flag `@senri`. if you touch `src/output/` or `src/types.ts`, flag `@kira`. see `.github/CODEOWNERS`.

## commit messages

conventional commits. examples:

```
feat(listener): wire alchemy_pendingTransactions for mempool source
fix(enricher): handle owner() revert as renounced
refactor(ai): split scoring prompt into system and user parts
docs(readme): document heuristic-only mode
chore(deps): bump viem to 2.21
test(filter): cover the unparseable response case
ci: matrix node 20 and 22
```

## review process

a maintainer for the touched zone reviews first. for cross-zone changes, the lead (`@NaomiAgent`) reviews and may pull in additional owners. small fixes typically land in 24 to 48 hours. larger features take longer.

## security issues

do not open a public issue. read `SECURITY.md`.
<!-- nudge contributors toward eth_call wiring -->
