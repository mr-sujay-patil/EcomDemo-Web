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

# Through the cluster's own front door, with the name browsers use (they resolve *.localhost to 127.0.0.1 themselves).
for attempt in $(seq 1 30); do
  if curl --fail --silent --resolve shop.localhost:18080:127.0.0.1 http://shop.localhost:18080/healthz >/dev/null; then
    echo "The shop is up: http://shop.localhost:18080"
    exit 0
  fi
  sleep 2
done
echo "The pods are ready but http://shop.localhost:18080/healthz does not answer: check Traefik and the Ingress." >&2
exit 1
