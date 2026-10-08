#!/usr/bin/env bash
# The whole E2E suite against the shop in the backend's kind cluster, through http://shop.localhost:18080 (Traefik).
#   1. k8s-up.sh puts the current image in the cluster (this app's four objects only).
#   2. The main suite runs. About 25 s in, ONE app pod is deleted in the background: the suite must still pass.
#   3. The @disruptive specs run alone: one pod deleted and a rolling update, each under steady traffic with zero failures.
# The backend's kind cluster must be up (scripts/k8s-up.sh in the read-only clone). Nothing here changes a backend object.
set -euo pipefail
cd "$(dirname "$0")/.."

bash scripts/k8s-up.sh

# Playwright (Chromium) resolves *.localhost itself; Node's fetch, used by the global setup, goes to the backend's own door.
export E2E_BASE_URL=http://shop.localhost:18080
export E2E_K8S=1
export API_TARGET=http://localhost:18080
# Lets Node (not just Chromium) resolve shop.localhost: see the file.
export NODE_OPTIONS="${NODE_OPTIONS:-} --require $PWD/scripts/localhost-dns.cjs"

# The live API against the snapshots this app was generated from. The cluster's backend is the backend team's, at whatever
# version they last built: a difference is reported here, loudly, but does not stop the run.
npm run api:check || echo "WARNING: the cluster's backend API differs from the snapshots in api/openapi (see above)." >&2

(
  sleep 25
  victim="$(kubectl --context kind-ecomdemo -n ecomdemo get pods -l app.kubernetes.io/name=ecomdemo-web -o name | head -n 1)"
  echo "Deleting $victim in the middle of the run"
  kubectl --context kind-ecomdemo -n ecomdemo delete "$victim" --wait=false
) &
killer=$!

status=0
npx playwright test --project=chromium --grep-invert "@disruptive" || status=$?
wait "$killer" || true

npx playwright test --project=chromium --grep "@disruptive" --workers=1 || status=$?
exit "$status"
