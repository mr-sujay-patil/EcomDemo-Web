# Recent Phase Summaries (rolling window: last 2 phases)

> Newest first. When a third summary is added, move the oldest to `docs/progress/archive/phase-XX-summary.md`. Maximum ~30 lines per summary: facts only, no narrative.

<!-- TEMPLATE
## Phase XX: <Title> (tag: phase-XX-complete, PR #N)
**What exists now:** <1–3 lines describing the app after this phase>
**Key code:** <features, components, hooks and modules that matter next>
**Config & infrastructure:** <scripts, env vars, ports, proxies, containers, and how to run>
**Tests:** <new unit/component/E2E tests and counts>
**Backend tested against:** <pinned tag>
**Gotchas:** <anything surprising the next phase must know>
**Owner TODOs open:** <TODO(owner) placeholders still waiting for the user>
**Backend asks:** <backend changes reported to the user, with web KI ids>
**Follow-ups (not done, out of scope):** <suggestions deferred to later phases>
-->

## Phase 20: Container Orchestration (tag: phase-20-complete, PR pending)
**What exists now:** The shop runs in the backend's kind cluster as a separate Kustomize app in the `ecomdemo` namespace: 2 replicas (non-root, read-only root, three `emptyDir`s, probes on `/healthz`, `preStop` sleep, `maxUnavailable: 0`), a Service, a ConfigMap (`API_UPSTREAM` = the gateway's full Service name) and an Ingress for host `shop.localhost` on the backend's Traefik: `http://shop.localhost:18080` is the shop, `localhost:18080` stays the backend's. No backend object was edited (spec fingerprints of all 43 identical before and after).
**Key code:** `k8s/` (`kustomization.yaml`, `deployment.yaml`, `service.yaml`, `configmap.yaml`, `ingress.yaml`), `scripts/k8s-up.sh`, `k8s-down.sh`, `e2e-k8s.sh`, `localhost-dns.cjs`, `e2e/k8s.spec.ts`. Decisions [Phase 20], web KI-025.
**Config & infrastructure:** `npm run e2e:k8s` (up, whole suite with a pod deleted ~25 s in, then the `@disruptive` specs alone). Context `kind-ecomdemo`, namespace `ecomdemo`; the scripts refuse any other. `NODE_OPTIONS=--require scripts/localhost-dns.cjs` lets Node resolve `*.localhost`. The shop is left deployed in the cluster after this phase (remove with `bash scripts/k8s-down.sh`).
**Tests:** 827 unit and component (unchanged); E2E through the Ingress 986 + 3 disruptive: **980 + 3 pass, 6 fail on this cluster's data and backend version (web KI-025)**, the same 6 fail the same way through the preview server against that backend.
**Backend tested against:** NOT the pin. The cluster's backend is ahead of `phase-34-complete` (paged catalogue, `dltTimestamp`) and its seed stock is drained. The compose stack at the pin was used for the Phase 19 merge verification.
**Gotchas:** nginx's resolver ignores the pod's DNS search path: use the full Service name or every `/api` is a 502. Without the `preStop` sleep a pod deletion loses requests. Playwright's `request` fixture resolves with `dns.promises.lookup`, not `dns.lookup`. A restart is needed after a ConfigMap change (`envFrom`): `k8s-up.sh` does it when the Deployment exists.
**Owner TODOs open:** unchanged from Phase 14; the Phase 18 screen-reader pass is still open.
**Backend asks:** for the owner to relay: the cluster runs a backend newer than the pin with used-up seed data (web KI-025); plus KI-019, 020, 021, 022, 024.
**Follow-ups (not done, out of scope):** a cluster-side NetworkPolicy; pulling the GHCR image instead of loading it; fixing the specs that assume seed stock and a small catalogue (needs approval, web KI-020/025).

## Phase 19: Containerization (tag: phase-19-complete, PR #24)
**What exists now:** The shop ships as one 21.7 MB image: nginx (1.30.5 alpine-slim, official) serving the production build, `/api` proxied to the gateway on the same origin, `/healthz`, SPA fallback, `immutable` hashed assets, `no-cache` index.html, gzip, no server version. Non-root (uid 101), read-only root filesystem, all capabilities dropped, port bound to 127.0.0.1. `compose.yaml` runs only `web` on `${WEB_PORT:-8070}`, joined to the backend's network as an external network. CI builds the image on every PR and publishes it to GHCR on a merge to `main`.
**Key code:** `Dockerfile`, `nginx/default.conf.template`, `compose.yaml`, `.dockerignore`, `scripts/e2e-docker.sh`, `e2e/container.spec.ts`, the `image` and `publish` jobs in `.github/workflows/ci.yml`. Decisions [Phase 19], web KI-024 (backend pagination, for the pin move).
**Config & infrastructure:** `npm run e2e:docker` (builds, starts only `web` on the running gateway's network, runs everything at `E2E_BASE_URL`, `docker compose down` on exit). `BACKEND_NETWORK` is `<backend compose project>_default`: `ecomdemo_default` for the backend team's checkout, `ecomdemo-backend-readonly_default` for the clone. `E2E_BASE_URL` points the suite at any running copy and turns off the preview server and the style guide route (`againstContainer` in `e2e/screens.ts`). New env in `.env.example`: `WEB_PORT`, `BACKEND_NETWORK`, `API_UPSTREAM`.
**Tests:** 827 unit and component (unchanged: no source change); E2E against the container 986 (985 pass, 1 fails on stock data, web KI-020), against the preview 1005 (1004 pass, 1 fails: the same). The two modes differ by design: the container run leaves out the dev-only style guide screens and adds the 8 container specs.
**Backend tested against:** `phase-34-complete`, started with `CUSTOMER_DB_PORT=15435`. Backend `main` is 46 commits past the pin; KI-007 pages `GET /api/products` (web KI-024), not adopted.
**Gotchas:** The image only fills `NGINX_LOCAL_RESOLVERS` when `NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1`. A `tmpfs` over `/var/cache/nginx` and `conf.d` needs `uid=101,gid=101` or nginx cannot write. `docker inspect` of a container has no `.Size` (use `docker image inspect`): found by running the CI step locally. A literal `proxy_pass` host stops nginx at start if it does not resolve: use a variable plus `resolver`. The gateway sends its own `Cache-Control`; do not add one.
**Owner TODOs open:** unchanged from Phase 14; the manual screen-reader pass of Phase 18 is still open.
**Backend asks:** none new. KI-019, KI-020, KI-021, KI-022 still to relay; KI-024 matters at the next pin move.
**Follow-ups (not done, out of scope):** CSP and security headers (Phase 22); pulling the published image in a deployment (Phase 20); a Trivy scan of the image in CI.
