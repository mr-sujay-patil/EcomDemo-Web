# Phase 3: End-to-End Smoke Tests

| | |
|---|---|
| **Stage** | Stage 1: Foundation |
| **Technology** | Playwright |
| **Branch** | `feature/phase-03-playwright` |
| **PR title** | `Phase 03: End-to-End Smoke Tests` |
| **Requires** | `phase-02-complete` on `main`; backend compose stack at the pinned tag |
| **Needs from the backend** | backend compose stack at the pinned tag |
| **Completion tag** | `phase-03-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** A real browser drives the built app against the real backend. From now on `npm run e2e` is the smoke test, and every phase adds checks to it.

**What you'll implement**
- `playwright.config.ts`: `webServer` runs `npm run build && npm run preview`; `baseURL` `http://localhost:4173`; Chromium; traces on first retry; screenshots on failure.
- `e2e/global-setup.ts`: checks the gateway answers (`GET /api/products` 200), prints the backend tag it finds (from the user or the clone), and stops the run with **one** clear message if the backend is down.
- `e2e/catalog.spec.ts`: the product list shows the seeded products; with the gateway unreachable (a route abort), the error state shows.
- **Width-and-theme matrix** `e2e/layout.spec.ts`: every page at 360, 480, 768, 1024 and 1280 px, light and dark (`colorScheme`): no horizontal scroll (`scrollWidth <= clientWidth`), no element with `overflow: hidden` clipping its text. It runs on every page added later.
- Console guard: any `console.error` or React warning fails the test.
- A tagged `@report` spec that saves screenshots at 360 and 1280 px into `docs/test-reports/phase-XX/`, so every later phase regenerates them the same way.
- npm scripts `e2e` and `e2e:ui`.

**Concepts to understand**
- End-to-end versus component tests: what each is for, and what each costs
- Auto-waiting and web-first assertions (`waitForTimeout` is banned)
- Test data you create versus data you assume (the seeded catalogue is assumed; customers will be created)
- Traces as the first debugging step

**Done when**
- `npm run e2e` passes against the real backend, and a deliberately clipped element at 360 px fails the matrix (shown, then reverted).

**Not in this phase:** CI (Phase 5), accessibility and visual comparison (Phase 18).

## E2E additions (`e2e/`)

Created here: the catalogue list, the backend-down error state, and the width-and-theme matrix.

## Your manual steps (user)

Approve `npx playwright install --with-deps chromium` (it asks for `sudo` in WSL2), then reply `done`.
