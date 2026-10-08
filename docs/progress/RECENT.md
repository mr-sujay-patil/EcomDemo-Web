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

## Phase 21: Performance (tag: phase-21-complete, PR pending)
**What exists now:** Budgets that fail a build: no JavaScript chunk over 100 KB gzipped and at most 170 KB for the shelf (`scripts/check-budgets.mjs`, in `npm run verify`); Lighthouse CI on the production container for the shelf and a product page (performance at least 90, CLS, JavaScript and font bytes hard; LCP a warning, because it measured 2.89 s on the CI runner against 2.40 s on a fast desktop); a signed-in Lighthouse flow for the cart and an order (CLS, TBT, INP). Measured, the shelf went from performance 87 to 96, CLS 0.177 to 0.001, JavaScript 192 to 128 KB. `docs/performance.md` has the method, the journey and what was not worth doing.
**Key code:** `lighthouserc.cjs`, `scripts/check-budgets.mjs`, `perf-flows.mjs`, `perf-report.mjs`, `perf.sh`; `vite.config.ts` (`vendor` chunk, `ANALYZE`), `router.tsx` (`lazyRoute`: sign-in and register), `Layout.tsx` (lazy assistant sheet), `ProductTile` (`priority`), `.reserve-page`, nginx `gzip_static` and `etag off`, `index.html` (one font preload). Decisions [Phase 21], web KI-026, KI-027 (LCP) and KI-028 (a flaky visual baseline).
**Config & infrastructure:** `npm run perf` (container up, Lighthouse CI, flows, container down), `perf:analyze`, `check:budgets`. CI: the `e2e` job runs `npm run perf` and uploads `perf-results/`, `.lighthouseci/`, `bundle-analysis/` as the `performance` artifact. New dev dependencies: `@lhci/cli`, `lighthouse`, `puppeteer-core`, `rollup-plugin-visualizer` (pinned).
**Tests:** 834 unit and component (was 827); E2E 1005 (1004 pass, 1 fails: web KI-020), against the container 986 (985 pass, the same 1).
**Backend tested against:** `phase-34-complete` (14 products).
**Gotchas:** A lazy route commits its location after its code arrives: tests `waitFor` it. `assertMatrix` in Lighthouse CI takes no other option (put `aggregationMethod` in each row). Making more routes lazy made the first paint later (more files to preload). Two vendor chunks were slower than one. On WSL, Lighthouse's Chrome launcher makes `C:\Users\...\lighthouse.*` folders in the working directory (`perf.sh` removes them). A timespan has no LCP. Lighthouse transfer sizes include response headers (the fonts passed only with `etag off`).
**Owner TODOs open:** unchanged from Phase 14; the Phase 18 screen-reader pass is still open.
**Backend asks:** none new (KI-019, 020, 021, 022, 024, 025 still to relay).
**Follow-ups (not done, out of scope):** deciding how LCP is enforced (calibrate the CPU slowdown for CI, or change the number: web KI-027); the product page's cold LCP; Brotli; HTTP/2; a CDN.

## Phase 20: Container Orchestration (tag: phase-20-complete, PR #25)
**What exists now:** The shop runs in the backend's kind cluster as a separate Kustomize app in the `ecomdemo` namespace: 2 replicas (non-root, read-only root, three `emptyDir`s, probes on `/healthz`, `preStop` sleep, `maxUnavailable: 0`), a Service, a ConfigMap (`API_UPSTREAM` = the gateway's full Service name) and an Ingress for host `shop.localhost` on the backend's Traefik: `http://shop.localhost:18080` is the shop, `localhost:18080` stays the backend's. No backend object was edited (spec fingerprints of all 43 identical before and after).
**Key code:** `k8s/` (`kustomization.yaml`, `deployment.yaml`, `service.yaml`, `configmap.yaml`, `ingress.yaml`), `scripts/k8s-up.sh`, `k8s-down.sh`, `e2e-k8s.sh`, `localhost-dns.cjs`, `e2e/k8s.spec.ts`. Decisions [Phase 20], web KI-025.
**Config & infrastructure:** `npm run e2e:k8s` (up, whole suite with a pod deleted ~25 s in, then the `@disruptive` specs alone). Context `kind-ecomdemo`, namespace `ecomdemo`; the scripts refuse any other. `NODE_OPTIONS=--require scripts/localhost-dns.cjs` lets Node resolve `*.localhost`. The shop is left deployed in the cluster after this phase (remove with `bash scripts/k8s-down.sh`).
**Tests:** 827 unit and component (unchanged); E2E through the Ingress 986 + 3 disruptive: **980 + 3 pass, 6 fail on this cluster's data and backend version (web KI-025)**, the same 6 fail the same way through the preview server against that backend.
**Backend tested against:** NOT the pin. The cluster's backend is ahead of `phase-34-complete` (paged catalogue, `dltTimestamp`) and its seed stock is drained. The compose stack at the pin was used for the Phase 19 merge verification.
**Gotchas:** nginx's resolver ignores the pod's DNS search path: use the full Service name or every `/api` is a 502. Without the `preStop` sleep a pod deletion loses requests. Playwright's `request` fixture resolves with `dns.promises.lookup`, not `dns.lookup`. A restart is needed after a ConfigMap change (`envFrom`): `k8s-up.sh` does it when the Deployment exists.
**Owner TODOs open:** unchanged from Phase 14; the Phase 18 screen-reader pass is still open.
**Backend asks:** for the owner to relay: the cluster runs a backend newer than the pin with used-up seed data (web KI-025); plus KI-019, 020, 021, 022, 024.
**Follow-ups (not done, out of scope):** a cluster-side NetworkPolicy; pulling the GHCR image instead of loading it; fixing the specs that assume seed stock and a small catalogue (needs approval, web KI-020/025).
