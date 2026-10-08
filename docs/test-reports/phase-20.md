# Test Report: Phase 20 (Container Orchestration)

- **Date:** 2026-10-08
- **Branch:** `feature/phase-20-kubernetes`
- **Run by:** Claude Code, on the owner's machine (Windows 11 + WSL2 Ubuntu; Docker 29.8.2; kind and kubectl from `/usr/local/bin`; Playwright's Chromium in WSL)
- **Node / npm:** v24.21.0 / 12.1.0; **no new dependencies**
- **Cluster:** the backend team's kind cluster `ecomdemo` (context `kind-ecomdemo`, namespace `ecomdemo`, Traefik, host port 18080), already running when I started (pods up for 9 days; the backend deployments about 70 to 95 minutes old). I did not create, restart or change anything of the backend's.
- **Merge verification of Phase 19** (before branching): PR #24 merged as `ad3504b`, tag `phase-19-complete`, every branch commit in `main`; `npm ci && npm run verify` exit 0 (827 tests); `npm run e2e:docker` on `main` 985 passed + 1 failed (web KI-020); CI on `main` fully green including **`publish`**: the log shows `ghcr.io/mr-sujay-patil/ecomdemo-web` pushed with digest `sha256:cec9f139…`, tagged `latest` and the commit SHA. (My token cannot list packages, so I read the push from the job log, not from GHCR.)
- **Backend sync** (before branching): the clone's `origin/main` is 49 commits past the pin; since the last report only gateway management-port fixes (KI-047) were added. Nothing new for the web. Pin unchanged.

## 1. Full regression

| Command | Result |
|---|---|
| `npm run verify` | exit 0: typecheck, lint (0 warnings), Prettier (the manifests and scripts included), `check:tokens`, **827 tests passed** (unchanged: no source file changed), 0 skipped, build ok |
| `kubectl kustomize k8s` / `kubectl apply -k k8s --dry-run=server` | the four objects validate; after the real deploy the server reports all four `unchanged` against the repository |

## 2. End-to-end suite, through `http://shop.localhost:18080`

`npm run e2e:k8s` (deploys, then the main suite with a pod deleted in the background about 25 s in, then the `@disruptive` specs alone):

| Part | Result |
|---|---|
| Main suite (986 tests; `container.spec.ts` and the style guide are not in this mode) | **980 passed, 6 failed** |
| The pod `ecomdemo-web-5996968f9-5bv42` deleted mid-run | the suite carried on; none of the 6 failures involve it (below) |
| `@disruptive` (3 tests, serial): two replicas behind the Ingress and `localhost:18080` unchanged; **one pod deleted under steady traffic: 0 failed requests**; **a rolling update under steady traffic: 0 failed requests, every pod replaced** | **3 passed**, and 3 of 3 runs in a row (22 s each) |

### ⚠️ The 6 failures: this cluster's backend and data, not Kubernetes (web KI-025)

`catalog` seeded products; `design` images; `checkout` "an order above 10 000" and "a refused order"; `orders` "my orders" and "someone else's order". Why I say it is not Kubernetes: **the same six fail the same way through the plain preview server against the same backend** (`API_TARGET=http://localhost:18080`, 11 passed, 6 failed on those four files). What the cluster's backend is:

- **Ahead of the pin.** `GET /api/products` is paged (`Link`, `X-Total-Count: 145`, 50 per page: backend KI-007) and the app API differs from the snapshots (`dltTimestamp`: backend KI-040). `npm run api:check` against it reports both. This is web KI-024 happening for real.
- **Used-up data.** Mechanical Keyboard, Wireless Mouse, USB-C Hub and Laptop Sleeve 16" have stock 0 (Desk Mat 58), so the shelf has no "Add to cart" for them: four of the failures time out clicking it (the general form of web KI-020).
- **Catalogue size.** The `catalog` and `design` specs assume the ten seeded products are on the shelf's first page of 24 sorted A to Z. With 50 products loaded, Wireless Mouse is on page 3. All ten seeds are in the API's first page, so nothing is missing; the spec's assumption is.

**Done when** says the full suite passes through the Ingress. **It does not on this cluster: 980 of 986, plus the 3 Kubernetes checks.** I did not reseed, restart or edit anything of the backend's to get green, and I did not change the specs (that needs your approval: it is KI-020/025 work, outside this phase's scope). What would close it: the backend team starts the cluster from `phase-34-complete` or reseeds it, then `npm run e2e:k8s` again.

## 3. Acceptance

| Check | Result | How |
|---|---|---|
| Deployment: 2 replicas, non-root, read-only root, `emptyDir` for nginx's paths | ✅ | `k8s/deployment.yaml` (uid 101, `fsGroup` 101, `readOnlyRootFilesystem`, caps dropped, seccomp `RuntimeDefault`); pods `Running` 1/1 |
| Service, ConfigMap (`API_UPSTREAM` the gateway's real Service name), probes on `/healthz`, requests and limits | ✅ | `k8s/`; the name is `gateway-service.ecomdemo.svc.cluster.local:8080`. The short name gave a 502 on the first deploy (nginx ignores the DNS search path); fixed and recorded |
| Ingress `shop.localhost` on the backend's Traefik; `localhost:18080` unchanged | ✅ | `curl --resolve`: `shop.localhost:18080/` and `/products/1` 200 HTML; `/api/products` 200 JSON; `localhost:18080/api/products` still the gateway, `localhost:18080/` still its 401; `k8s.spec.ts` asserts it |
| Never edits backend objects or files | ✅ | fingerprint of the spec (and data) of all 43 backend Deployments, Services, Ingresses, ConfigMaps, StatefulSets and HPAs: identical before and after; the read-only clone untouched |
| `scripts/k8s-up.sh` / `k8s-down.sh`, this app only | ✅ | `up` run 5 times (build, `kind load`, apply, restart when it existed, wait, check through the Ingress); both refuse any cluster but `kind-ecomdemo`; `down` deletes only what `k8s/kustomization.yaml` lists. ⚠️ `k8s-down.sh` was **not run**: I left the shop deployed for your review |
| `npm run e2e:k8s` | ⚠️ | runs end to end and exits 1 because of the 6 above |
| A pod deleted mid-run | ✅ | in the main run (background job) and in `@disruptive` (0 failed requests under traffic) |
| A rolling update with no failed request | ✅ | `@disruptive`, 3 of 3 runs |
| The zero-failure checks can fail | ✅ | with the `preStop` sleep removed from my live Deployment, 1 of the 3 failed on both runs; restored from `k8s/` (`apply` reported it `configured`, `preStop` back to `sleep 8`) |

## 4. Widths and themes

No screen changed (no file under `src/`), so no new screenshots; the layout matrix and the Phase 18 baselines ran in the main suite through the Ingress and passed (they are among the 980).

## 5. Things to know

- ⚠️ **The shop is still deployed in the backend team's cluster** (2 pods, 24 Mi each). Open http://shop.localhost:18080 to look at it. Remove it with `bash scripts/k8s-down.sh` (only its four objects). The backend's own `k8s-down.sh` deletes the whole cluster, the shop with it.
- ⚠️ **Tell the backend team** (web KI-025): their cluster runs a backend newer than `phase-34-complete` with used-up seed stock. That is fine for them, but this repository tests against the pin; a cluster started from the pinned tag, or reseeded, lets Phase 20's suite pass clean. A message you can forward is in the PR.
- The first request after a restart can be a 502 while an old pod with the old config is still serving; it settles within seconds (seen once, after the ConfigMap change).
- `kind load docker-image` added one image (`ecomdemo-web:k8s`) to the node's image store; nothing else on the node changed.
- The `ecomdemo-azure-control-plane` kind node on this machine (a second cluster) was not touched.
- **Not done, on purpose:** a cloud cluster (the phase says so); a NetworkPolicy; pulling from GHCR; fixing the data-dependent specs.
- **Owner placeholders:** unchanged. Nothing written for the shop.

## 6. Clean-up

The backend's compose stack I started earlier (for the Phase 19 merge verification) is stopped. The kind cluster is the backend team's and is left running, with the shop in it as described above.
