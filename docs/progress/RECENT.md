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

## Phase 21: Performance (tag: phase-21-complete, PR #26)
**What exists now:** Budgets that fail a build: no JavaScript chunk over 100 KB gzipped and at most 170 KB for the shelf (`scripts/check-budgets.mjs`, in `npm run verify`); Lighthouse CI on the production container for the shelf and a product page (performance at least 90, CLS, JavaScript and font bytes hard; LCP a warning, because it measured 2.89 s on the CI runner against 2.40 s on a fast desktop); a signed-in Lighthouse flow for the cart and an order (CLS, TBT, INP). Measured, the shelf went from performance 87 to 96, CLS 0.177 to 0.001, JavaScript 192 to 128 KB. `docs/performance.md` has the method, the journey and what was not worth doing.
**Key code:** `lighthouserc.cjs`, `scripts/check-budgets.mjs`, `perf-flows.mjs`, `perf-report.mjs`, `perf.sh`; `vite.config.ts` (`vendor` chunk, `ANALYZE`), `router.tsx` (`lazyRoute`: sign-in and register), `Layout.tsx` (lazy assistant sheet), `ProductTile` (`priority`), `.reserve-page`, nginx `gzip_static` and `etag off`, `index.html` (one font preload). Decisions [Phase 21], web KI-026, KI-027 (LCP) and KI-028 (a flaky visual baseline).
**Config & infrastructure:** `npm run perf` (container up, Lighthouse CI, flows, container down), `perf:analyze`, `check:budgets`. CI: the `e2e` job runs `npm run perf` and uploads `perf-results/`, `.lighthouseci/`, `bundle-analysis/` as the `performance` artifact. New dev dependencies: `@lhci/cli`, `lighthouse`, `puppeteer-core`, `rollup-plugin-visualizer` (pinned).
**Tests:** 834 unit and component (was 827); E2E 1005 (1004 pass, 1 fails: web KI-020), against the container 986 (985 pass, the same 1).
**Backend tested against:** `phase-34-complete` (14 products).
**Gotchas:** A lazy route commits its location after its code arrives: tests `waitFor` it. `assertMatrix` in Lighthouse CI takes no other option (put `aggregationMethod` in each row). Making more routes lazy made the first paint later (more files to preload). Two vendor chunks were slower than one. On WSL, Lighthouse's Chrome launcher makes `C:\Users\...\lighthouse.*` folders in the working directory (`perf.sh` removes them). A timespan has no LCP. Lighthouse transfer sizes include response headers (the fonts passed only with `etag off`).
**Owner TODOs open:** unchanged from Phase 14; the Phase 18 screen-reader pass is still open.
**Backend asks:** none new (KI-019, 020, 021, 022, 024, 025 still to relay).
**Follow-ups (not done, out of scope):** deciding how LCP is enforced (calibrate the CPU slowdown for CI, or change the number: web KI-027); the product page's cold LCP; Brotli; HTTP/2; a CDN.
