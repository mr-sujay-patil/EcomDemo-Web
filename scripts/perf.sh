#!/usr/bin/env bash
# Performance against the production image: build it, start ONLY `web` on the backend's network, then
#   1. Lighthouse CI (lighthouserc.cjs): the shelf and a product page, cold, three runs each, mobile, throttled; the median is
#      judged against the budgets (performance, LCP, CLS, JavaScript and font bytes);
#   2. scripts/perf-flows.mjs: the cart and an order, signed in (CLS, blocking time, the click's own delay), three runs.
# The median table of each is printed whatever the verdict, and kept in perf-results/. Exits 1 if any budget is broken.
# The backend stack must already be up (docs/process/development-environment.md); this script never starts or stops it.
set -uo pipefail
cd "$(dirname "$0")/.."

gateway="${GATEWAY_CONTAINER:-ecomdemo-gateway-service}"
network="${BACKEND_NETWORK:-$(docker inspect "$gateway" --format '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}} {{end}}' 2>/dev/null | awk '{print $1}')}"
if [ -z "$network" ]; then
  echo "The backend is not running: no container named $gateway. Start its stack first (docs/process/development-environment.md)." >&2
  exit 1
fi
export BACKEND_NETWORK="$network"
port="${WEB_PORT:-8070}"
export PERF_BASE_URL="http://localhost:${port}"
# A Chrome for Lighthouse: the caller's, otherwise the Chromium Playwright installed.
export CHROME_PATH="${CHROME_PATH:-$(node -p "require('@playwright/test').chromium.executablePath()")}"

# On WSL, Lighthouse's Chrome launcher makes its profile folders with Windows-style names ("C:\Users\...\lighthouse.XXXX") in the
# working directory, and does not remove them. They are only its scratch space: take them away, whatever the verdict. (No-op elsewhere.)
cleanup() {
  docker compose down
  find . -maxdepth 1 -type d -name 'C:*lighthouse.*' -exec rm -rf {} +
}
trap cleanup EXIT
docker compose up --build --wait -d || exit 1

mkdir -p perf-results
rm -rf .lighthouseci
status=0

npx lhci collect --config=lighthouserc.cjs || exit 1
node scripts/perf-report.mjs current
# GitHub's artifact upload skips hidden folders: keep the raw runs where it will take them.
rm -rf perf-results/lhci && cp -r .lighthouseci perf-results/lhci
npx lhci assert --config=lighthouserc.cjs || status=1

node scripts/perf-flows.mjs || status=1

exit "$status"
