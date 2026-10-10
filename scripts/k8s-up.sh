#!/usr/bin/env bash
# Puts the shop in the backend's kind cluster: build the image, load it into the cluster's node, apply k8s/, wait until it
# serves. This app only: it adds four objects to the `ecomdemo` namespace (see k8s/kustomization.yaml) and changes no backend
# object. The cluster itself is the backend's (scripts/k8s-up.sh in the read-only clone): this script never creates one.
set -euo pipefail
cd "$(dirname "$0")/.."

cluster=ecomdemo
context="kind-${cluster}"
namespace=ecomdemo
image=ecomdemo-web:k8s

# Refuse to run against any cluster but the backend's kind cluster, whatever kubectl currently points at.
if ! kubectl --context "$context" get namespace "$namespace" >/dev/null 2>&1; then
  echo "The backend's kind cluster is not up: no context '$context' with a namespace '$namespace'." >&2
  echo "Start it from the backend (scripts/k8s-up.sh in ../ecomdemo-backend-readonly), or ask the backend team." >&2
  exit 1
fi
if ! kubectl --context "$context" -n "$namespace" get service gateway-service >/dev/null 2>&1; then
  echo "The backend's gateway-service is not in namespace '$namespace' yet; the shop would have nothing to forward /api to." >&2
  exit 1
fi
kc=(kubectl --context "$context" -n "$namespace")

docker build --quiet -t "$image" .
# The node keeps its own copy of the image; the backend's images are loaded the same way (imagePullPolicy: Never).
kind load docker-image "$image" --name "$cluster"

existed=false
"${kc[@]}" get deployment ecomdemo-web >/dev/null 2>&1 && existed=true
"${kc[@]}" apply -k k8s
# The tag does not change when the image does, so a deployment that was already there is restarted to pick the new one up.
if [ "$existed" = true ]; then "${kc[@]}" rollout restart deployment/ecomdemo-web; fi
"${kc[@]}" rollout status deployment/ecomdemo-web --timeout=180s

# The cluster's CA (public certificate only), from the backend's Secret: scripts/e2e-k8s.sh and anyone using the shop trust it
# to verify https://shop.localhost:18443 (web KI-034). Read, never written, on the cluster side.
ca_file=.local/cluster-ca.crt
mkdir -p "$(dirname "$ca_file")"
"${kc[@]}" get secret ecomdemo-ca-public -o 'jsonpath={.data.tls\.ca}' | base64 -d > "$ca_file"
[ -s "$ca_file" ] || { echo "The backend's Secret ecomdemo-ca-public has no tls.ca: is its cluster from before backend KI-056?" >&2; exit 1; }

# Through the cluster's own front door, with the name browsers use (they resolve *.localhost to 127.0.0.1 themselves), and
# with the certificate verified: a cluster whose certificate lacks shop.localhost (before backend KI-060) fails here.
for attempt in $(seq 1 30); do
  if curl --fail --silent --cacert "$ca_file" --resolve shop.localhost:18443:127.0.0.1 https://shop.localhost:18443/healthz >/dev/null; then
    echo "The shop is up: https://shop.localhost:18443 (CA: $ca_file)"
    exit 0
  fi
  sleep 2
done
echo "The pods are ready but https://shop.localhost:18443/healthz does not answer with a certificate that verifies:" >&2
curl --silent --show-error --output /dev/null --cacert "$ca_file" --resolve shop.localhost:18443:127.0.0.1 https://shop.localhost:18443/healthz >&2 || true
echo "Check Traefik, the Ingress, and that the backend's certificate names shop.localhost (backend KI-060)." >&2
exit 1
