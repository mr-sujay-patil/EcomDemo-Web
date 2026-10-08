# Test Report: Phase 23 (Observability)

- **Date:** 2026-10-08
- **Branch:** `feature/phase-23-observability`
- **Run by:** Claude Code, on the owner's machine (Windows 11 + WSL2 Ubuntu), Node v24.21.0
- **New dependencies (pinned):** `@opentelemetry/api` 1.9.1, `@opentelemetry/sdk-trace-web` 2.12.0, `@opentelemetry/instrumentation` 0.223.0, `@opentelemetry/instrumentation-fetch` 0.223.0, `web-vitals` 6.2.3. `npm audit --omit=dev` stays at 0; `npm run audit:deps` unchanged.
- **Backend:** commit `f088fd4` (the pin since PR #28), stack started from the read-only clone with `CUSTOMER_DB_PORT=15435`. Its seed stock is used up (web KI-020), so the specs that buy something fail here (below).
- **Merge verification of Phase 22** (before branching): tag `phase-22-complete` on `165402d`; `verify` and CI on `main` green. Backend sync: `origin/main` `33d6f1a`, three commits past the pin, all backend CI changes; nothing for the web.
- **Owner permission used:** stopping and restarting `ecomdemo-catalog-service` (twice, with `scripts/e2e-service-down.sh`, which always starts it again; it was healthy afterwards both times).

## 1. Unit and component tests

`npm run verify`: see section 5. **871 tests** (was 855): 12 for the error pages and reference, 4 for tracing, 2 for web vitals (error pages: a route that throws keeps the header and footer; the layout that throws gets a page of its own; the root boundary; Copy and its failure; the unhandled-rejection alert once, dismissable, ignoring an `AbortError`; tracing: `traceparent` on `/api` only, a new trace per call, none for other paths or other origins).

## 2. End-to-end

- **`e2e/observability.spec.ts`**: every `fetch` to `/api` carries a `traceparent` (`00-<32 hex>-<16 hex>-01`) and an `X-Correlation-Id`, one trace per call; nothing else carries a `traceparent`; the simulated outage (`503` from `/api/products` with a correlation id) shows the message, the reference, Copy (clipboard read back), with the header and footer usable; Retry brings the shelf back. All pass.
- **The real outage** (`npm run e2e:service-down`: the catalogue container stopped, the spec run, the container started again): the shelf showed *"The product catalogue is temporarily unavailable. Please try again shortly."* with reference `83132222-06d4-460f-bd71-9969d951d972`; the reference is one of the ids the page sent. The harness' pre-check (`e2e/global-setup.ts`) now accepts a `503` only in this run.
- `npm run e2e:docker` (the container, **CSP in force**; the `cspGuard` fixture fails any test on a violation): **987 passed, 5 failed, 1 skipped**, zero CSP violations. The skipped one is the real-outage spec (it runs only from `e2e-service-down.sh`). The 5 failures: `checkout` x2 and `keyboard-flows` (stock is 0 on this machine, web KI-020: the same three as in Phase 22) and the `register-errors` keyboard sweep, light and dark (web KI-026, a known flake under load; 30 of 30 repeats of the spec alone pass). ⚠️ These are not passes. CI starts a fresh backend, so it is the real check for the first three.
- The first container run had 8 failures. Two were my own Phase 22 specs, which took "the first `/assets/` link in the page" and the build now puts the preloaded font before the scripts (fixed: the specs name a script and the font preload explicitly). Three (axe on `product-list` and `search-results` at 1280 px dark, the shelf visual at 360 px light) did not recur on a rerun of the whole suite and pass on the preview server twice.

## 3. The Done-when item: "the reference finds the gateway's log line and the trace"

Tried on the real failure, the pinned backend, with Grafana's data sources (Loki `:3100`, Tempo `:3200`):

| Step | Result |
|---|---|
| Reference on screen | `83132222-06d4-460f-bd71-9969d951d972` (screenshots below) |
| The request | `X-Correlation-Id: 83132222-…`, `traceparent: 00-ee7bf1ed09212e483437da129dd02560-c7359b900dfa278f-01`; the response echoed the id |
| **Tempo**, trace `ee7bf1ed…` | ✅ found: `gateway-service`, `http get /fallback/catalog`, 1068 ms, and a short `evalsha`. The browser's trace id is the trace |
| **Loki**, `correlation_id="83132222-…"` and `trace_id="ee7bf1ed…"` | ⚠️ **nothing**: the gateway writes **no request log line** (30 lines since start-up, all boot logs) and no service saw the request. Backend KI-035; recorded as web KI-032 |
| A healthy request, for comparison (`curl` with a chosen id and `traceparent`) | ✅ `correlation_id=e2e-probe3-1791477050` found in Loki (`catalog-service`, `GET /api/products -> 200 in 19ms`, with `traceId`), the same trace id found in Tempo with spans from the gateway, catalog and inventory services |

**So half of the Done-when item is proven and half is not:** the browser starts the trace and it can be found; the reference alone cannot find a gateway-answered failure in Loki, because the gateway logs nothing. Not worked around. The message for the backend team is in the PR.

**An environment finding:** Loki was empty at first because Alloy ships only containers of the compose project `ecomdemo`, and this clone's project is `ecomdemo-backend-readonly`. Worked around locally with an override file outside both repositories that mounts a patched copy of the Alloy config (the clone is untouched; running the stack as project `ecomdemo` would have attached the backend team's volumes). Written up in `docs/troubleshooting.md` and `docs/process/development-environment.md`.

Screenshots of the shelf with the catalogue really down, at 360 and 1280 px, light and dark: `docs/test-reports/phase-23/shelf-service-down-{1280,360}-{light,dark}.png`.

## 4. Performance (`npm run perf`; the cost of tracing)

| | Before (Phase 22) | After |
|---|---|---|
| Shelf JavaScript on the wire (gzip, `check-budgets`) | 130.5 KB | **147.0 KB** (limit 170) |
| Lighthouse shelf: performance / LCP / TBT / CLS | 96 / 2.40 s / 13 ms / 0.001 | 95 / 2.41 s / 44 ms / 0.001 |
| Lighthouse product page: performance / LCP | 95 / 2.58 s | 94 / 2.74 s (warning, as before) |
| Fonts | 119.9 KB | 119.9 KB |

All Lighthouse assertions pass (LCP stays the Phase 21 warning). ⚠️ The signed-in flows (cart and order: CLS, TBT, INP) could not run here: they add Desk Mat to the cart and its stock is 0 (web KI-020). CI runs them on a fresh backend. Web Vitals are logged in development only (`[web-vitals] LCP 1234.568 (good)`); a production build has none of it.

## 5. Gates

| Command | Result |
|---|---|
| `npm ci && npm run verify` | exit 0: typecheck, lint, format, tokens, **871 tests** with coverage, build, budgets (shelf 147.0 KB of 170), dist check. (An earlier run failed once on `saga.test.tsx`, web KI-029, which passes alone and on the rerun) |
| `npm run audit:deps` | exit 0, 2 accepted advisories unchanged |
