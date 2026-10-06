# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-06
- **Phase:** 13 — Checkout and Order Tracking
- **Branch:** `feature/phase-13-checkout`
- **Step:** BRANCHED
- **PR:** none yet
- **Backend pinned at:** `phase-34-complete`. No stack runs now: start it from `../ecomdemo-backend-readonly` (`docker compose up --build --wait`) and stop it at the end with `docker compose --profile tools down` (no `-v`).
- **Waiting for user:** NO

## Merge verification before this phase
Phase 12 (PR #15, merge `052ca5c`, tag `phase-12-complete`): PASS on 2026-10-06: `npm ci && npm run verify` 607/607, `npm run e2e` 312/312 (read before tagging). Backend sync: `origin/main` is 16 commits past the pin (CI scans KI-044, dead-letter replay KI-040, mvnw.cmd EOL, test flake): nothing for orders or the saga; the saga deadline exists at the pin (backend Phase 32).

## Checklist (from the phase file's "What you'll implement")
- [ ] Place order `POST /api/orders`: loading, never retried; on a network error re-read `GET /api/orders` first
- [ ] 409 up front: message by the line, offer to lower the quantity, cart kept
- [ ] 201 → `/orders/:id`: `SagaTimeline` polling `/status` every 1-2 s; 15 s "Taking longer than usual"; stop at ~90 s; pause when hidden; stop at CONFIRMED/CANCELLED
- [ ] CONFIRMED: confirmation + `StaffNote` from `src/content/notes.ts` (TODO(owner), not rendered until written)
- [ ] CANCELLED: reason + "Add these items to my cart again"
- [ ] State machine `src/features/checkout/orderStatus.ts` (placing → pending → slow → confirmed | cancelled | gaveUp), unit-tested with fake timers
- [ ] `docs/modules/checkout.md`, decisions; tests + E2E; test report + screenshots; `RECENT.md` rotated (Phase 11 archived); tracker 🔵

## Next action
Read the guide's Orders section and the saga notes (`grep -n -i "saga\|PENDING" docs/backend/integration-guide.md`), `design-system/patterns.md` (order page, SagaTimeline), `src/components/SagaTimeline`, `src/features/checkout/CheckoutPage.tsx` (placeholder), the cart code from Phase 12; write the plan; implement the checklist in order, committing after each item.

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
