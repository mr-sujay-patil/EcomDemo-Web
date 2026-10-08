# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-08
- **Phase:** 17 — Admin Console
- **Branch:** `feature/phase-17-admin`
- **Step:** STARTED (read the phase file; nothing built yet)
- **PR:** none
- **Backend pinned at:** `phase-34-complete`. No stack runs now: start it from `../ecomdemo-backend-readonly` with `CUSTOMER_DB_PORT=15435 docker compose up --build --wait -d` (Windows app SignalRgb holds 5435) and stop it at the end with `docker compose --profile tools down` (no `-v`).
- **Waiting for user:** no. Open items to relay: web KI-019, KI-020, KI-021; ADMIN embeddings backfill; decision on `chore/pin-backend-<tag>` (see Merge verification)

## Merge verification before this phase
Phase 16 (PR #20, merge `d3da037`, tag `phase-16-complete`): all branch commits in `main`; CI on `main` green; `npm ci && npm run verify` exit 0 on `main` (2026-10-08). E2E not re-run locally (no stack); CI e2e passed. Backend sync 2026-10-08: `origin/main` is 31 commits past the pin (KI-002/003/004/040/044 fixes). New for the web: KI-004 gateway circuit breaker answers 503 + `Retry-After: 10` + `ApiError` on catalogue reads; KI-040 dead-letter replay identity adds `dltTimestamp` (matters to the optional saga support). Pin stays `phase-34-complete`.

## Checklist (from the phase file's "What you'll implement")
- [x] `/admin/*` lazy-loaded, ADMIN only; CUSTOMER sees "Not permitted"
- [x] Products: list, create, full-replace edit, delete with typed confirmation
- [x] Generate description (owner chose: warn, then Restore previous; web KI-022)
- [ ] Stock: set a level (not a delta)
- [ ] CSV import: header check, preview, `skipCount`
- [ ] Search index backfill: 202 + poll every 2 s
- [ ] Saga support (optional, last)
- [ ] `docs/modules/admin.md`; tests; E2E additions

## Next action
Slice 2: stock (`GET /api/inventory?productIds=`, `PUT /api/inventory/{id}` sets a level), then CSV import, search-index backfill, optional saga support, `docs/modules/admin.md`, E2E (`e2e/admin.spec.ts`), test report. Components live in `src/features/admin/`; sections are routed inside `AdminPage.tsx`.

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
