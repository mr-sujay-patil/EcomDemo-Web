#!/usr/bin/env bash
# The real failure test for Phase 23: stop ONE backend service, run only the spec that expects the reference page, and start
# the service again, pass or fail. The backend stack must already be up (docs/process/development-environment.md); this
# script stops and starts a single container and nothing else, and never touches volumes.
#   bash scripts/e2e-service-down.sh                 # the catalogue service
#   SERVICE=ecomdemo-catalog-service bash scripts/e2e-service-down.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# The container prefix follows the gateway's name: ecomdemo-* by default, webstack-* from scripts/backend-stack.sh (GATEWAY_CONTAINER).
prefix="${GATEWAY_CONTAINER:-ecomdemo-gateway-service}"
service="${SERVICE:-${prefix%-gateway-service}-catalog-service}"
if [ "$(docker inspect --format '{{.State.Running}}' "$service" 2>/dev/null)" != true ]; then
  echo "$service is not running. Start the backend stack first." >&2
  exit 1
fi

# Back up on exit, pass or fail, and wait until the service answers its health check again.
trap 'echo "Starting $service again..."; docker start "$service" >/dev/null; for _ in $(seq 1 60); do [ "$(docker inspect --format "{{.State.Health.Status}}" "$service")" = healthy ] && break; sleep 2; done; docker inspect --format "$service: {{.State.Health.Status}}" "$service"' EXIT

echo "Stopping $service..."
docker stop "$service" >/dev/null
E2E_SERVICE_DOWN=1 npx playwright test --project=chromium e2e/observability.spec.ts -g "really stopped"
