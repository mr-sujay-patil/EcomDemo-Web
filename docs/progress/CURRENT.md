# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-09-30
- **Phase:** 3 — End-to-End Smoke Tests
- **Branch:** `feature/phase-03-playwright`
- **Step:** BRANCHED
  (NOT_STARTED | PREFLIGHT | BRANCHED | PLANNING | IMPLEMENTING | TESTING | PR_OPEN | VERIFYING | WAITING_FOR_USER)
- **PR:** none yet
- **Backend pinned at:** `ki-001-fixed` (read-only clone `../ecomdemo-backend-readonly`)
- **Waiting for user:** NO

## Merge verification before this phase
Phase 2 (PR #2, merge commit `e276d34`, parents `f262f43` + `8012dc3`): PASS on 2026-09-30. PR state MERGED; branch tip is an ancestor of `origin/main`; `git log main..branch` and `git diff --stat` empty; branch exists locally and on GitHub; deliverables present on `main`; `npm ci && npm run verify` green on `main` (6/6 tests; no `npm run e2e` before Phase 3). Tag `phase-02-complete` pushed.

## Design (decided)
- (none yet)

## Checklist (from the phase file's "What you'll implement")
- [ ] `playwright.config.ts`: `webServer` = `npm run build && npm run preview`; `baseURL` `http://localhost:4173`; Chromium; traces on first retry; screenshots on failure
- [ ] `e2e/global-setup.ts`: gateway check (`GET /api/products` 200), prints the backend tag (user or clone), one clear message if the backend is down
- [ ] `e2e/catalog.spec.ts`: seeded products shown; gateway unreachable (route abort) → error state
- [ ] `e2e/layout.spec.ts`: every page at 360/480/768/1024/1280 px, light and dark: no horizontal scroll, no `overflow: hidden` clipping text
- [ ] Console guard: any `console.error` or React warning fails the test
- [ ] `@report` spec: screenshots at 360 and 1280 px into `docs/test-reports/phase-XX/`
- [ ] npm scripts `e2e` and `e2e:ui`
- [ ] Manual step: user approves `npx playwright install --with-deps chromium` (sudo), replies `done`
- [ ] Done when: `npm run e2e` passes against the real backend; a deliberately clipped element at 360 px fails the matrix (shown, then reverted)
- [ ] Testing protocol → `docs/test-reports/phase-03.md`; docs (README, `decisions.md`, `RECENT.md`, tracker 🔵) → PR

## Next action
Install `@playwright/test` (exact, stable) and write `playwright.config.ts`.

## ⚠️ Environment notes (this machine)
- One backend stack at a time: if `ecomdemo-gateway-service` is running, use it (it was running at Phase 3 start).
- The repo folder is `~/projects/ecomdemo-web` (lowercase), not `~/projects/EcomDemo-Web` as the docs say; relative paths still work.
- Node v24.21.0 via nvm in WSL, loaded only by interactive shells (`~/.bashrc`). Non-interactive commands must `. ~/.nvm/nvm.sh` first, or `npm` resolves to the Windows install under `/mnt/c`.
- Root `ecomdemo-frontend-integration-guide.md` is an untracked duplicate of `docs/backend/integration-guide.md` (owner's choice); leave it.
- Claude Code runs on Windows: run git/gh/npm in WSL. `wsl.exe -- bash -lc "…"` expands `$vars` in the outer shell first, so put multi-step commands in a script file and run `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash /mnt/c/…/script.sh` (Git Bash on the UNC path hits "dubious ownership"; `gh` is only in WSL). The Chrome extension blocks localhost: use headless Chrome (`--dump-dom`, `--enable-logging=stderr`).
- `~/.cache/ms-playwright` already holds `chromium-1243` and `chromium_headless_shell-1243` from an earlier install.

## ⚠️ Carried, not fixed (oldest first)
- 
