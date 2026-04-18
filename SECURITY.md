# security policy

naomi is a read-only analyzer. she has no signer, no wallet, no executor. the
attack surface is therefore narrow: api keys in `.env`, network calls to
ethereum rpcs and etherscan, and the webhook sink that posts verdicts
outbound. we still take security seriously.

## scope

in scope:
- ssrf vectors via `output.webhook_url` if a user copy-pastes a malicious url
- key exfiltration via process env or log lines
- supply-chain risk in dependencies
- prompt-injection vectors that cause the ai filter to leak unrelated content
- denial of service via crafted token metadata that explodes the enricher

out of scope:
- rate limiting on rpc providers
- bugs in third-party rpcs, etherscan, or anthropic themselves
- losses from acting on a verdict (this is decision support, not a command)

## reporting

email: security@naomi.bot

include:
- a description of the issue
- a reproduction or proof of concept
- the version or commit you tested

we acknowledge within 48 hours. for confirmed issues we coordinate disclosure and credit. please do not open a public issue.

## operational guidance for users

- if you point the webhook sink at a public service, treat the analyzed
  json as untrusted output: it includes deployer-controlled fields like
  `metadata.name` and `metadata.symbol`.
- keep `ETHERSCAN_API_KEY` and `ANTHROPIC_API_KEY` in `.env`, not in
  `config.yaml`. naomi reads only `.env` for secrets.
- revoke any rpc, etherscan, or anthropic keys that touch this codebase
  if you suspect compromise.
