# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-08
- **Phase:** 14 — Orders and Profile
- **Branch:** `feature/phase-14-orders-profile`
- **Step:** PR_OPEN
- **PR:** #18 (CI running on the head)
- **Backend pinned at:** `phase-34-complete`. No stack runs now: start it from `../ecomdemo-backend-readonly` (`docker compose up --build --wait`) and stop it at the end with `docker compose --profile tools down` (no `-v`).
- **Waiting for user:** YES: review of the Phase 14 PR; decide about web KI-020 and the backend running ahead of the pin (optional: write `orderConfirmedNote` in `src/content/notes.ts`)

## Merge verification before this phase
Phase 13 (PR #16, merge `2443ab3`, tag `phase-13-complete`): tag exists on the merge commit. Backend sync 2026-10-08: `origin/main` is past the pin by KI-002/040/044/045/046 fixes and docs only; nothing for orders, customers or the gateway. Pin stays `phase-34-complete`.

## Checklist (from the phase file's "What you'll implement")
- [x] My orders `/orders`: table, newest first, client-side paging, StatusBadge + reason
- [x] Order detail `/orders/:id` nested under the list; 403 and 404 both "Order not found"
- [x] Profile `/account`: `GET/PUT /api/customers/me`, full name only; says there is no password change (web KI-006); header follows
- [x] `docs/modules/orders.md`, `docs/modules/account.md`, decisions [Phase 14]; tests (662) + E2E (309/310); report + screenshots; `RECENT.md` rotated (Phase 12 archived); tracker 🔵; floor 99.88 / 97.5 / 100 / 100

## Next action
Wait for the owner's review. On `approved, merge it`: `gh pr merge <n> --merge` (no `--delete-branch`); merge verification on `main` (`npm ci && npm run verify`; the Playwright suite, **read the result before tagging**; know that `api:check` and the stock-refusal spec fail on the running backend, see below); tag `phase-14-complete`. The first commit of the next branch updates the tracker row (14 ✅) and this file. Before the next phase: `git fetch` the backend clone and compare with the pin. Relay web KI-019 and web KI-020. Next phase only on `continue`: Phase 15 (read its file first).

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
