# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-09-30
- **Phase:** 3 — End-to-End Smoke Tests
- **Branch:** `feature/phase-03-playwright`
- **Step:** TESTING
  (NOT_STARTED | PREFLIGHT | BRANCHED | PLANNING | IMPLEMENTING | TESTING | PR_OPEN | VERIFYING | WAITING_FOR_USER)
- **PR:** none yet
- **Backend pinned at:** `ki-001-fixed` (read-only clone `../ecomdemo-backend-readonly`)
- **Waiting for user:** NO

## Merge verification before this phase
Phase 2 (PR #2, merge commit `e276d34`, parents `f262f43` + `8012dc3`): PASS on 2026-09-30. PR state MERGED; branch tip is an ancestor of `origin/main`; `git log main..branch` and `git diff --stat` empty; branch exists locally and on GitHub; deliverables present on `main`; `npm ci && npm run verify` green on `main` (6/6 tests; no `npm run e2e` before Phase 3). Tag `phase-02-complete` pushed.

## Design (decided)
- `@playwright/test` 1.63.0; `tsconfig.e2e.json` (referenced by `tsconfig.json`) so `tsc -b` checks `e2e/` + the config
- Two projects: `chromium` (smoke, `grepInvert: /@report/`) and `report` (`grep: /@report/`); `e2e` = `--project=chromium`, extra script `e2e:report` = `--project=report` (the report spec needs a way to run that isn't the smoke run)
- `e2e/screens.ts` = registry of screens × states; `layout.spec.ts` and `report.spec.ts` loop over it
- `e2e/fixtures.ts`: specs import `test`/`expect` from here; auto fixture fails on `console.error`, `console.warning` matching React, `pageerror`; per-test `allowedConsoleErrors` (route abort logs "Failed to load resource: net::ERR_FAILED")
- `reuseExistingServer: false`; `retries` 0 locally / 2 on CI
- Report dir = `REPORT_PHASE` or the branch's `phase-XX`, resolved inside the test (loading must not fail on `main`)
- Preview is a production build: React's dev-only warnings can't appear there; the guard still catches errors + uncaught exceptions
- Manual step not needed: Chromium 1243 (the build 1.63.0 wants) was already installed and launches headless, so its system libs are present

## Checklist (from the phase file's "What you'll implement")
- [x] `playwright.config.ts`: `webServer` = `npm run build && npm run preview`; `baseURL` `http://localhost:4173`; Chromium; traces on first retry; screenshots on failure
- [x] `e2e/global-setup.ts`: gateway check (`GET /api/products` 200), prints the backend tag (user or clone), one clear message if the backend is down
- [x] `e2e/catalog.spec.ts`: seeded products shown; gateway unreachable (route abort) → error state
- [x] `e2e/layout.spec.ts`: every page at 360/480/768/1024/1280 px, light and dark: no horizontal scroll, no `overflow: hidden` clipping text
- [x] Console guard: any `console.error` or React warning fails the test
- [x] `@report` spec: screenshots at 360 and 1280 px into `docs/test-reports/phase-XX/`
- [x] npm scripts `e2e` and `e2e:ui`
- [x] Manual step: not needed (browser + libs already present; launch proven)
- [x] Done when: `npm run e2e` 22/22 exit 0; temporary `@media (max-width:400px) h2 {width:120px; overflow:hidden}` → exit 1, only the two 360 px tests failed; reverted → 22/22
- [ ] Testing protocol → `docs/test-reports/phase-03.md`; docs (README, `decisions.md`, `RECENT.md`, tracker 🔵) → PR

## Next action
Run the testing protocol (npm ci && verify, dev + preview console check), write `docs/test-reports/phase-03.md`, update README/decisions/RECENT/tracker 🔵, push, raise the PR, stop.

## ⚠️ Environment notes (this machine)
- One backend stack at a time: if `ecomdemo-gateway-service` is running, use it (it was running at Phase 3 start).
- The repo folder is `~/projects/ecomdemo-web` (lowercase), not `~/projects/EcomDemo-Web` as the docs say; relative paths still work.
- Node v24.21.0 via nvm in WSL, loaded only by interactive shells (`~/.bashrc`). Non-interactive commands must `. ~/.nvm/nvm.sh` first, or `npm` resolves to the Windows install under `/mnt/c`.
- Root `ecomdemo-frontend-integration-guide.md` is an untracked duplicate of `docs/backend/integration-guide.md` (owner's choice); leave it.
- Claude Code runs on Windows: run git/gh/npm in WSL. `wsl.exe -- bash -lc "…"` expands `$vars` in the outer shell first, so put multi-step commands in a script file and run `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash /mnt/c/…/script.sh` (Git Bash on the UNC path hits "dubious ownership"; `gh` is only in WSL). The Chrome extension blocks localhost: use headless Chrome (`--dump-dom`, `--enable-logging=stderr`).
- `~/.cache/ms-playwright` already holds `chromium-1243` and `chromium_headless_shell-1243` from an earlier install.

## ⚠️ Carried, not fixed (oldest first)
- 
