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

## Phase 03: End-to-End Smoke Tests (tag: phase-03-complete, PR #3)
**What exists now:** The app is unchanged; `npm run e2e` builds and previews it, then drives it in Chromium against the real backend: the catalogue, the gateway-unreachable error state, and every screen at 360/480/768/1024/1280 px in light and dark.
**Key code:** `playwright.config.ts`; `e2e/global-setup.ts` (gateway check, prints the backend tag from `BACKEND_TAG` or the clone); `e2e/fixtures.ts` (**import `test`/`expect` from here**: console guard, `allowedConsoleErrors` option); `e2e/screens.ts` (**add every new screen/state here**: `name`, `path`, `prepare`, `ready`, `allowedConsoleErrors`; also `gatewayUnreachable`, `abortedRequestError`); `e2e/catalog.spec.ts`; `e2e/layout.spec.ts`; `e2e/report.spec.ts` (`@report`).
**Config & infrastructure:** @playwright/test 1.63.0 (Chromium build 1243). Projects `chromium` (smoke, excludes `@report`) and `report`. Scripts: `e2e` (`--project=chromium`), `e2e:ui`, `e2e:report` (screenshots → `docs/test-reports/phase-XX/`, phase from the branch or `REPORT_PHASE`). `tsconfig.e2e.json` joins `tsc -b`. `webServer` never reuses a running 4173. Retries 0 locally, 2 on CI (traces on first retry).
**Tests:** 22 E2E (2 catalogue + 20 layout matrix) + 8 report screenshots; 6 component tests unchanged.
**Backend tested against:** `ki-001-fixed`
**Gotchas:** Aborting a request makes Chrome log "Failed to load resource: net::ERR_FAILED": declare it in `allowedConsoleErrors`. React dev warnings never show in the preview build, so keep the dev-server console check. The catalogue has 22 rows but only ids 1–10 are seeded: assert names, never counts. "Dark" screenshots equal light until Phase 9 adds `color-scheme`. `pkill -f <pattern>` inside `bash -c` also matches its own shell.
**Owner TODOs open:** none
**Backend asks:** none
**Follow-ups (not done, out of scope):** run `e2e` in CI with the backend (Phase 5); the "Try again" button on the error state (carried; the E2E suite should then click it); `npx playwright install --with-deps` for CI runners (Phase 5).

## Phase 02: Automated Testing (tag: phase-02-complete, PR #2)
**What exists now:** The app is unchanged; it now has unit/component tests (Vitest in jsdom, Testing Library, MSW faking the network) that run inside `npm run verify`.
**Key code:** `src/test/setup.ts` (jest-dom matchers, MSW server with `onUnhandledFrame: 'error'`, `cleanup()`), `src/test/render.tsx` (`renderWithProviders`, an empty wrapper: add the router/query client/session here), `src/test/msw/handlers.ts` (`handlers` = happy paths; `productHandlers.{success,empty,serverError}`; `productFixtures`, typed with `http.get<never, never, Body>`), `src/features/catalog/ProductListPage.test.tsx`.
**Config & infrastructure:** `test` block in `vite.config.ts` (jsdom, `src/**/*.test.{ts,tsx}`, V8 coverage of `src/` minus `src/test`, tests and `main.tsx`). Scripts: `test` (`vitest run`), `test:coverage`, `verify` = typecheck && test && build.
**Tests:** 6 component tests (loading → list, ₹ en-IN format, `null` → "Other", empty, 500 message + correlation id, network error + sent id). Coverage floor 91.11 / 74.19 / 91.66 / 97.5 (stmts/branches/funcs/lines).
**Backend tested against:** `ki-001-fixed` (the app re-run via dev + preview; the tests need no backend)
**Gotchas:** MSW 3 renamed `onUnhandledRequest` → `onUnhandledFrame`; the old key is silently ignored at runtime. No Vitest globals: import from `vitest`. Coverage thresholds are enforced only by `test:coverage`. The seeded catalogue now has 22 products (10 in Phase 1).
**Owner TODOs open:** none
**Backend asks:** none
**Follow-ups (not done, out of scope):** tests for the defensive branches (non-`ApiError` error body, abort, no `crypto.randomUUID`) would raise the branch floor; run `test:coverage` in CI (Phase 5); "Try again" button on the error state (carried from Phase 1).
