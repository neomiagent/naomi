# contributing to naomi

prs are welcome. this file explains what to expect.

## tl;dr

1. fork, branch off `main`.
2. write the change, keep it focused.
3. run `npm run typecheck` locally before opening the pr.
4. open a pr, link the issue if one exists.
5. one of the maintainers (see `MAINTAINERS.md`) reviews within a few days.

## what we want

- new launch sources under `src/listener/`. each source emits a `TokenEvent`. add a feature flag in `config.yaml` under `sources.`
- better enrichment. faster bundle clustering, smarter deployer history, richer social signals.
- tests. the parser in `src/ai/filter.ts` and the bundle clustering in `src/enricher/bundle.ts` are the two highest-value targets.
- docs. fix typos, clarify `ARCHITECTURE.md`, add examples.
- ci improvements that keep the build under one minute.

## what we do not want

- secrets in commits. ever. the `.gitignore` covers `.env` and `config.yaml` but double check.
- new top-level dependencies without a reason. naomi is small on purpose.
- premature optimization. the bottleneck is rpc latency, not local compute.
- ai-generated prs without a human review. we will close them.

## style

- typescript strict mode, no `any` without a reason.
- imports use `node:` prefix for builtins.
- prefer pure functions in the enricher and filter.
- match the existing zone-of-ownership layout. if you touch `src/listener/`, flag `@0xnova`. if you touch `src/ai/`, flag `@senri`. see `.github/CODEOWNERS`.

## commit messages

conventional commits. examples:

```
feat(listener): meteora dlmm pool init handler
fix(enricher): handle missing token supply on fresh mints
refactor(ai): split scoring prompt into system and user parts
docs(readme): document paper mode default
chore(deps): bump @solana/web3.js to 1.95
test(filter): cover the unparseable response case
ci: cache npm install across jobs
```

## review process

a maintainer for the touched zone reviews first. for cross-zone changes, the lead (`@NaomiAgent`) reviews and may pull in additional owners. small fixes typically land in 24 to 48 hours. larger features take longer.

## security issues

do not open a public issue. read `SECURITY.md`.
