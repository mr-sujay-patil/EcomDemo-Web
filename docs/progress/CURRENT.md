# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-08
- **Phase:** 14 — Orders and Profile
- **Branch:** `feature/phase-14-orders-profile`
- **Step:** IMPLEMENTING (nothing built yet)
- **PR:** none yet
- **Backend pinned at:** `phase-34-complete`. No stack runs now: start it from `../ecomdemo-backend-readonly` (`docker compose up --build --wait`) and stop it at the end with `docker compose --profile tools down` (no `-v`).
- **Waiting for user:** no (optional: write `orderConfirmedNote` in `src/content/notes.ts`)

## Merge verification before this phase
Phase 13 (PR #16, merge `2443ab3`, tag `phase-13-complete`): tag exists on the merge commit. Backend sync 2026-10-08: `origin/main` is past the pin by KI-002/040/044/045/046 fixes and docs only; nothing for orders, customers or the gateway. Pin stays `phase-34-complete`.

## Checklist (from the phase file's "What you'll implement")
- [ ] My orders `/orders`: table from `GET /api/orders`, newest first, client-side paging, StatusBadge + statusReason
- [ ] Order detail `/orders/:id` nested with the list; lines; timeline for PENDING; 403 and 404 both "Order not found"
- [ ] Profile `/account`: `GET/PUT /api/customers/me`, full name only, form kit; say plainly there is no password change (web KI-006)
- [ ] `docs/modules/orders.md`, `docs/modules/account.md`; tests; E2E (two users); report; RECENT rotated

## Next action
Read the integration guide sections for orders and customers/me, then build My orders. Replace the placeholders in `src/app/router.tsx` (lines ~57-63). The existing `/orders/:id` is Phase 13's `OrderPage`; reuse it for PENDING.

## ⚠️ Environment notes (this machine)
- The backend team's own stack (`~/projects/ecomdemo`, compose project `ecomdemo`) was running on 2026-10-06 and reported `phase-34-complete-2-g40fed61` (two commits past the tag). Its API matched the tag (snapshots differ only by `imageUrl` and the image path). Never stop or touch it; starting the clone's stack fails on the container names while it runs.
- One backend stack at a time: if `ecomdemo-gateway-service` is running, use it.
- The repo folder is `~/projects/ecomdemo-web` (lowercase), not `~/projects/EcomDemo-Web` as the docs say; relative paths still work.
- Node v24.21.0 via nvm in WSL, loaded only by interactive shells (`~/.bashrc`). Non-interactive commands must `. ~/.nvm/nvm.sh` first, or `npm` resolves to the Windows install under `/mnt/c`.
- Root `ecomdemo-frontend-integration-guide.md` is an untracked duplicate of `docs/backend/integration-guide.md` (owner's choice); leave it.
- Claude Code runs on Windows: run git/gh/npm in WSL. `wsl.exe -- bash -lc "…"` expands `$vars` in the outer shell first, so put multi-step commands in a script file and run `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash /mnt/c/…/script.sh` (Git Bash on the UNC path hits "dubious ownership"; `gh` is only in WSL). Redirect the script's output to a file in WSL and `cat` it, or lines get mangled. The Chrome extension blocks localhost: use headless Chrome (`--dump-dom`, `--enable-logging=stderr`).
- `~/.cache/ms-playwright` already holds `chromium-1243` and `chromium_headless_shell-1243`.

## ⚠️ Carried, not fixed (oldest first)
-
