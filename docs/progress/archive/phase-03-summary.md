# Phase 03 Summary (archived from RECENT.md)

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
