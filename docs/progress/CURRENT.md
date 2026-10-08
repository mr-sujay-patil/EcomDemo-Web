# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-08
- **Phase:** 18 — Accessibility
- **Branch:** `feature/phase-18-accessibility`
- **Step:** PR_OPEN
- **PR:** raised, see `gh pr list` (CI running on the head)
- **Backend pinned at:** `phase-34-complete`. No stack runs now: start it from `../ecomdemo-backend-readonly` with `CUSTOMER_DB_PORT=15435 docker compose up --build --wait -d` (Windows app SignalRgb holds 5435) and stop it at the end with `docker compose --profile tools down` (no `-v`).
- **Waiting for user:** YES: review of the Phase 18 PR; the manual screen-reader pass in `docs/accessibility.md` (reply `done` with notes); read the CI result on the visual baselines (generated on this machine). Carried: set `E2E_ADMIN_USERNAME` / `E2E_ADMIN_PASSWORD` and run `e2e/admin.spec.ts` (and add them as CI secrets); relay web KI-019, KI-020, KI-021, KI-022 to the backend team; the ADMIN embeddings backfill; decide on `chore/pin-backend-<tag>`)

## Merge verification before this phase
Phase 17 (PR #21, merge `10795ed`, tag `phase-17-complete` on origin): all branch commits in `main`; CI on `main` green; `npm ci && npm run verify` exit 0 on `main` (2026-10-08). Backend sync 2026-10-08: `origin/main` is 40 commits past the pin (KI-002/003/004/005/006/040/044/045/046); nothing new for the web beyond what Phase 16 reported; Phase 18 needs nothing from the backend. Pin stays `phase-34-complete`.

## Checklist (from the phase file's "What you'll implement")
- [x] axe on every route (signed out, customer, admin) in both themes; fail on serious/critical (`e2e/a11y.spec.ts`, 2 widths; fixed unnamed header links and nested controls in search options)
- [x] Keyboard-only runs (`e2e/keyboard-flows.spec.ts`, pointer guard); focus visible and no trap on every screen (`e2e/keyboard-sweep.spec.ts`; both proven able to fail)
- [x] 200% zoom, 400% zoom (320 px) and 20 px root font pass the overflow checks (`e2e/zoom.spec.ts`; fixed header tools row, import file input, style guide specimens)
- [x] `prefers-reduced-motion`: spinner slows, no other motion (`e2e/motion.spec.ts`)
- [x] `toHaveScreenshot` baselines: 32 in `e2e/visual.spec.ts-snapshots/` (stubbed with page.route, exact compare; `npm run e2e:baselines` updates)
- [x] `docs/accessibility.md` with manual screen-reader checklist
- [x] Done-when proof: `--radius-md` 4→9 px fails 32/32, 4→5 px fails 15/32 (reverted)
- [x] Full `npm run e2e` (1004 pass, 1 fails: web KI-020), report screenshots, `docs/test-reports/phase-18.md`, RECENT.md rotated, pushed, PR raised, stack stopped
- Also fixed in this phase (web KI-023): unnamed header links, nested controls in search options, 320 px reflow, account menu left open when focus moved on

## Next action
Wait for the owner's review. The backend stack is STOPPED (started from the clone with `CUSTOMER_DB_PORT=15435`, taken down with `docker compose --profile tools down`, no `-v`). On `approved, merge it`: read the CI result on the PR head (the 32 visual baselines were drawn here and have not been seen on CI: if CI differs, regenerate from CI's artifact as a reviewed change), `gh pr merge <n> --merge` (no `--delete-branch`); merge verification on `main` (`npm ci && npm run verify`; start the stack with `CUSTOMER_DB_PORT=15435 docker compose up --build --wait -d` in `../ecomdemo-backend-readonly`, run `npm run e2e`, read the result before tagging; web KI-020 fails on stock data); tag `phase-18-complete`; stop the stack. The first commit of the next branch updates the tracker row (18 ✅) and this file. Before the next phase: fetch the backend clone and compare with the pin. Next phase only on `continue`: Phase 19 (read its file first).

## ⚠️ Environment notes (this machine)
- The backend team's own stack (`~/projects/ecomdemo`, compose project `ecomdemo`) was running on 2026-10-06 and reported `phase-34-complete-2-g40fed61` (two commits past the tag). Its API matched the tag (snapshots differ only by `imageUrl` and the image path). Never stop or touch it; starting the clone's stack fails on the container names while it runs.
- One backend stack at a time: if `ecomdemo-gateway-service` is running, use it.
- The repo folder is `~/projects/ecomdemo-web` (lowercase), not `~/projects/EcomDemo-Web` as the docs say; relative paths still work.
- Node v24.21.0 via nvm in WSL, loaded only by interactive shells (`~/.bashrc`). Non-interactive commands must `. ~/.nvm/nvm.sh` first, or `npm` resolves to the Windows install under `/mnt/c`.
- Root `ecomdemo-frontend-integration-guide.md` is an untracked duplicate of `docs/backend/integration-guide.md` (owner's choice); leave it.
- Claude Code runs on Windows: run git/gh/npm in WSL. `wsl.exe -- bash -lc "…"` expands `$vars` in the outer shell first, so put multi-step commands in a script file and run `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash /mnt/c/…/script.sh` (Git Bash on the UNC path hits "dubious ownership"; `gh` is only in WSL). Redirect the script's output to a file in WSL and `cat` it, or lines get mangled. The Chrome extension blocks localhost: use headless Chrome (`--dump-dom`, `--enable-logging=stderr`).
- `~/.cache/ms-playwright` already holds `chromium-1243` and `chromium_headless_shell-1243`.

## ⚠️ Carried, not fixed (oldest first)
- web KI-020: `e2e/checkout.spec.ts` refused-order spec needs Laptop Sleeve stock 2; the shared backend has 0.
- The backend stack running here (`ecomdemo-gateway-service`) is ahead of the pin: `npm run e2e` stops at `api:check` (dead-letter admin schema `dltTimestamp`). Run `npx playwright test --project=chromium` and say so, or have the owner approve a `chore/pin-backend-<tag>`.
