#!/usr/bin/env bash
# Takes the shop out of the backend's kind cluster: deletes exactly the objects listed in k8s/kustomization.yaml (the
# Deployment, Service, ConfigMap and Ingress named ecomdemo-web) and nothing else. The cluster and every backend object stay.
set -euo pipefail
cd "$(dirname "$0")/.."

context=kind-ecomdemo
if ! kubectl --context "$context" get namespace ecomdemo >/dev/null 2>&1; then
  echo "No cluster '$context' with a namespace 'ecomdemo': nothing to remove."
  exit 0
fi
kubectl --context "$context" delete -k k8s --ignore-not-found
