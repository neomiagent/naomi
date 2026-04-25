#!/usr/bin/env bash
# try-naomi — 30-second smoke test of the published npm package.
# uses public ethereum rpc, heuristic-only ai (no anthropic key needed),
# stdout sink only. spins up, watches uniswap v2 + v3 for ~30s, exits.
set -euo pipefail

WORK="$(mktemp -d -t naomi-try.XXXXXX)"
trap 'rm -rf "$WORK"' EXIT
cd "$WORK"

cat > .env <<'EOF'
ETH_RPC_URL=https://eth.llamarpc.com
ETH_WS_URL=wss://ethereum-rpc.publicnode.com
ETHERSCAN_API_KEY=YourApiKeyToken
ANTHROPIC_API_KEY=
EOF

cat > config.yaml <<'EOF'
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
  enabled: false
  prompt_cache: false
output:
  stdout: true
EOF

echo "==> installing naomi-scanner via npx (latest)"
npx --yes naomi-scanner@latest --help >/dev/null 2>&1 || true

echo "==> watching uniswap v2 + v3 for 30 seconds"
echo "    (heuristic-only mode, no anthropic key, public rpc)"
echo

# gtimeout on macos via brew, timeout on linux. fall back to background+sleep+kill.
if command -v timeout >/dev/null 2>&1; then
  timeout 30 npx --yes naomi-scanner@latest || true
elif command -v gtimeout >/dev/null 2>&1; then
  gtimeout 30 npx --yes naomi-scanner@latest || true
else
  npx --yes naomi-scanner@latest &
  PID=$!
  sleep 30
  kill "$PID" 2>/dev/null || true
  wait "$PID" 2>/dev/null || true
fi

echo
echo "==> done. cleanup ${WORK}"
