# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-09-30
- **Phase:** 2 — Automated Testing
- **Branch:** `feature/phase-02-testing`
- **Step:** TESTING
  (NOT_STARTED | PREFLIGHT | BRANCHED | PLANNING | IMPLEMENTING | TESTING | PR_OPEN | VERIFYING | WAITING_FOR_USER)
- **PR:** none yet
- **Backend pinned at:** `ki-001-fixed` (read-only clone `../ecomdemo-backend-readonly`)
- **Waiting for user:** NO

## Merge verification before this phase
Phase 1 (PR #1, merge commit `f262f43`, parents `d6b0d66` + `ba1cb44`): PASS on 2026-09-30. PR state MERGED; branch tip is an ancestor of `origin/main`; `git log main..branch` and `git diff --stat` empty; branch exists locally and on GitHub; deliverables present on `main`; `npm ci && npm run verify` green on `main` (no `npm run e2e` before Phase 3). Tag `phase-01-complete` pushed.

## Design (decided)
- MSW 3 renamed `onUnhandledRequest` → `onUnhandledFrame` (the old key is silently ignored at runtime; only `tsc` caught it). Proven: an unmocked fetch fails the test
- No Vitest globals: explicit imports, manual `cleanup()` in setup
- Coverage thresholds = measured 91.11 / 74.19 / 91.66 / 97.5 (stmts/branches/funcs/lines); enforced by `test:coverage`, not `verify`
- Done when: `₹1,299.00` → `₹1,299.01` made `verify` exit 1 (1 failed / 5 passed, build not reached); reverted, `verify` exit 0

## Checklist (from the phase file's "What you'll implement")
- [x] Vitest via `vite.config.ts` (jsdom), `src/test/setup.ts` with jest-dom matchers, `@testing-library/user-event`
- [x] MSW: `src/test/msw/handlers.ts` for `GET /api/products` (success, empty, 500 `{status, message}` + `X-Correlation-Id`); server in setup with `onUnhandledRequest: 'error'`
- [x] `src/test/render.tsx`: `renderWithProviders` (empty for now)
- [x] Product list tests: loading → list; empty; error shows `message`; network error shows correlation id; `null` category → "Other"; ₹ prices
- [x] Coverage (V8): `npm run test:coverage`; thresholds = measured values (raised, never lowered)
- [x] `docs/process/testing-guide.md` (short): query priority, `userEvent` over `fireEvent`, one behaviour per test, no markup snapshots, typed MSW handlers
- [x] `verify` = typecheck && test (`vitest run`) && build
- [x] Done when: a deliberately broken assertion fails `verify` (shown, then reverted)
- [x] Testing protocol → `docs/test-reports/phase-02.md`; docs (README, `decisions.md`, `RECENT.md`, tracker 🔵) → PR

## Next action
Testing protocol: backend check (`docker ps`), `npm run dev` + `npm run preview` against the backend (console clean), then `docs/test-reports/phase-02.md`, docs (README, `decisions.md` `[Phase 02]`, `RECENT.md`, tracker 🔵), PR.

## ⚠️ Environment notes (this machine)
- One backend stack at a time: if `ecomdemo-gateway-service` is running, use it.
- The repo folder is `~/projects/ecomdemo-web` (lowercase), not `~/projects/EcomDemo-Web` as the docs say; relative paths still work.
- Node v24.21.0 via nvm in WSL, loaded only by interactive shells (`~/.bashrc`). Non-interactive commands must `. ~/.nvm/nvm.sh` first, or `npm` resolves to the Windows install under `/mnt/c`.
- Root `ecomdemo-frontend-integration-guide.md` is an untracked duplicate of `docs/backend/integration-guide.md` (owner's choice); leave it.
- Claude Code runs on Windows: run git/gh/npm through `wsl.exe -d Ubuntu -- bash -lc '...'` (Git Bash on the UNC path hits git's "dubious ownership" check, and `gh` isn't installed there).

## ⚠️ Carried, not fixed (oldest first)
- 
