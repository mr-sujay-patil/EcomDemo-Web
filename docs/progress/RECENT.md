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

## Phase 23: Observability (tag: phase-23-complete, PR #31)
**What exists now:** A render error shows a page with a reference instead of a blank screen: the route boundary keeps the header and footer, the root page stands alone, and one alert shows a reference for a promise nobody caught. Every `fetch` to `/api` carries a W3C `traceparent` (OpenTelemetry Web, no exporter) next to `X-Correlation-Id`. `docs/troubleshooting.md` follows a reference to Loki and Tempo with a worked example from a real failure (catalogue service stopped). **Half of the Done-when item is not possible at the pinned backend:** the gateway writes no request log, so the reference cannot find a gateway-answered failure in Loki (web KI-032, backend KI-035); the trace is found with the browser's trace id.
**Key code:** `src/app/ErrorPages.tsx`, `RootErrorBoundary.tsx`, `UnhandledRejectionNotice.tsx`, `errorReference.ts`, `tracing.ts`, `webVitals.ts`; `src/components/ErrorReference/` (shared by `ErrorPanel`); `router.tsx` (a pathless route with `errorElement` under the layout); `e2e/observability.spec.ts`, `scripts/e2e-service-down.sh` (`npm run e2e:service-down`: stops `ecomdemo-catalog-service`, always restarts it; the spec is skipped otherwise). Decisions [Phase 23].
**Config & infrastructure:** new pinned dependencies `@opentelemetry/*` and `web-vitals`. Shelf JavaScript 147.0 KB gzipped (was 130.5; limit 170). Chores after Phase 22: the backend pin is commit `f088fd4` (PR #28); CI caches the backend images from `backend-images.yml` on main and runs `verify` and `e2e` on pull requests only (PR #29); `CLAUDE.md` has the workflow rules (PR #30, in conflict with some hard rules: follow the hard rules).
**Tests:** 871 unit and component (was 855); container E2E (CSP on) 987 pass, 5 fail locally (stock 0, KI-020 x3; KI-026 sweep x2), CI green on a fresh backend.
**Backend tested against:** commit `f088fd4` (backend `main`, `ki-011-fixed`).
**Gotchas:** Loki gets logs only from the compose project `ecomdemo` (Alloy's regex); a clone in another folder name has an empty Loki (use a local override, never run it as `ecomdemo`). `traceparent` is only on `fetch`, not on `<img>`. An `E2E` pre-check accepts a 503 only when `E2E_SERVICE_DOWN` is set. The first `/assets/` link in `index.html` is the font preload, not a script.
**Owner TODOs open:** unchanged from Phase 14; the Phase 18 screen-reader pass is still open.
**Backend asks:** KI-032 (gateway request log or a correlation id on its span); still to relay: KI-019, 020, 021, 022, 024, 025.
**Follow-ups (not done):** web KI-030 (the shelf and admin list are not paged) and KI-031 (503 with `Retry-After`) from the backend's change note; show the trace id beside the reference; an OTLP dev exporter (needs a backend change); Part 1 rule conflicts and branch protection (owner).

## Phase 22: Security (tag: phase-22-complete, PR #27)
**What exists now:** Every response from the web container carries a strict CSP (`default-src 'self'`; no `unsafe-inline`, no `unsafe-eval`, no host exceptions) plus Referrer-Policy, nosniff, Permissions-Policy and COOP, except `.woff2` files (headers cost 449 B each and broke the font budget). CI audits dependencies (`npm run audit:deps` with an expiring allowlist), scans the image with Trivy and attaches a CycloneDX SBOM; `npm run verify` also checks `dist/` for secrets, source maps and backend addresses. `docs/security.md` maps the OWASP Top 10.
**Key code:** `nginx/security-headers.conf` (included in every location; `/api` hides the gateway's copies), `public/theme-init.js` (was inline), `src/app/zodConfig.ts` (`jitless`: zod's eval probe is a CSP violation), `scripts/check-dist.mjs`, `scripts/audit-deps.mjs` + `audit-allowlist.json` (extract-zip x2, expires 2026-12-31), `.trivyignore.yaml` (empty), `e2e/fixtures.ts` (`cspGuard`), `e2e/container.spec.ts` (headers). Decisions [Phase 22].
**Config & infrastructure:** `npm run audit:deps`, `check:dist`. Dockerfile: `apk upgrade --no-cache pcre2` (remove when the nginx base ships the fix). `overrides`: `tmp` 0.2.7, `basic-ftp` 6.2.2. `verify` now runs the unit tests with coverage (once).
**Tests:** 855 unit and component (was 834); E2E against the container: CI 1005 pass; zero CSP violations (`cspGuard`).
**Backend tested against:** `phase-34-complete`, then the pin moved (chore PR #28) to commit `f088fd4` (backend `main`, tag `ki-011-fixed`).
**Gotchas:** nginx drops server-level `add_header` in a location that has its own: include the snippet in every location. Lighthouse counts response headers in transfer size. `zoom.spec.ts` uses `bypassCSP` (it injects a user stylesheet). Coverage thresholds (100% lines) fail CI for an untested new file. `gh pr edit` fails on this repo (classic Projects): use `gh api -X PATCH`.
**Owner TODOs open:** unchanged from Phase 14; the Phase 18 screen-reader pass is still open.
**Backend asks:** none new (KI-019, 020, 021, 022, 024, 025 still to relay).
**Follow-ups (not done):** TLS/HSTS at the ingress, Trusted Types, CSP reporting (fits this phase's error reporting), scheduled audits, Dependabot.
