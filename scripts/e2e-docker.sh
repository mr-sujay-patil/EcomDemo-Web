#!/usr/bin/env bash
# The whole E2E suite against the web container: build the image, start ONLY `web` on the backend's network, run the
# suite at http://localhost:${WEB_PORT:-8070}, and bring only `web` down again. The backend stack must already be up
# (docs/process/development-environment.md); this script never starts, stops or changes it.
set -euo pipefail
cd "$(dirname "$0")/.."

gateway="${GATEWAY_CONTAINER:-ecomdemo-gateway-service}"
# The network the running gateway is on (its compose project's default network), unless the caller names one.
network="${BACKEND_NETWORK:-$(docker inspect "$gateway" --format '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}} {{end}}' 2>/dev/null | awk '{print $1}')}"
if [ -z "$network" ]; then
  echo "The backend is not running: no container named $gateway. Start its stack first (docs/process/development-environment.md)." >&2
  exit 1
fi
export BACKEND_NETWORK="$network"
port="${WEB_PORT:-8070}"

# `down` on exit, pass or fail. Compose removes the container and leaves the (external) backend network alone.
trap 'docker compose down' EXIT
docker compose up --build --wait -d

E2E_BASE_URL="http://localhost:${port}" npm run e2e
