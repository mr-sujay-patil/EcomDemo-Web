# Phase 20: Container Orchestration

| | |
|---|---|
| **Stage** | Stage 6: Delivery |
| **Technology** | Kubernetes (the backend's kind cluster and ingress) |
| **Branch** | `feature/phase-20-kubernetes` |
| **PR title** | `Phase 20: Container Orchestration` |
| **Requires** | `phase-19-complete` on `main`; the backend's kind cluster and ingress running (backend Phase 25) |
| **Needs from the backend** | backend k8s manifests and ingress |
| **Completion tag** | `phase-20-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** Run the app in the backend's local cluster, the way production would, without changing the backend's manifests.

**What you'll implement**
- `k8s/` with Kustomize: `Deployment` (2 replicas, the GHCR image or a locally loaded one, non-root, read-only root filesystem with `emptyDir` for nginx's temp paths), `Service`, `ConfigMap` (`API_UPSTREAM` = the gateway Service's real name in the backend's namespace, read from the backend's `k8s/`), readiness and liveness probes on `/healthz`, requests and limits.
- An `Ingress` rule for host **`shop.localhost`** on the backend's Traefik: `http://shop.localhost:18080` serves the app while the backend's own Ingress keeps `localhost:18080` unchanged. Browsers resolve `*.localhost` to 127.0.0.1 without editing hosts files.
- Deployed into the backend's namespace (the Ingress and gateway Service must share it) as a separate Kustomize app with its own labels; it never edits backend objects or files.
- `scripts/k8s-up.sh` / `scripts/k8s-down.sh` for **this app only** (build, `kind load docker-image`, apply, wait; delete only this app's objects).
- `npm run e2e:k8s`: the suite against `http://shop.localhost:18080`, plus deleting one app pod mid-run and a rolling update with no failed request.

**Concepts to understand**
- Deployments, Services and Ingress host rules
- Probes for a static site
- Sharing a cluster without touching another team's objects
- Read-only root filesystems

**Done when**
- The full suite passes through `shop.localhost:18080`, including the pod-deletion and rolling-update checks.

**Not in this phase:** a cloud cluster.

## E2E additions (`e2e/`)

`npm run e2e:k8s` through the Ingress; a pod deleted during the run; a rolling update with zero failed requests.

## Your manual steps (user)

Have the backend's kind cluster up (`scripts/k8s-up.sh` in the read-only clone, or ask the backend team), then reply `done`.
