# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-10
- **Task:** fix KI-020 (`e2e/checkout.spec.ts` "a quantity above stock is refused up front" needs the seeded Laptop Sleeve 16" at stock 2; on a used backend it is 0 and the spec times out)
- **Branch:** `fix/ki-020-own-stock` (cut from `main` at `7eb65c5`; KI-028 merged, CI on `main` green)
- **Step:** BRANCHED
- **Backend pinned at:** commit `669a9ed1dfcc8ef0d89608c87ef05421bb157fb6` (unchanged by this fix)
- **Waiting for user:** no

## Checklist
- [ ] Root cause, with evidence: the spec reads a fixed product and a fixed stock it does not own
- [ ] Regression check: the spec itself, arranging its own precondition (works on a fresh and on a used backend)
- [ ] Fix: the spec picks an in-stock product from the live catalogue and puts the line in the cart through the API
- [ ] `npm ci && npm run verify`; the e2e spec runs in CI's `e2e` job (no backend stack in this container)
- [ ] Docs: KNOWN_ISSUES (Fixed, PR #n), decision if it sets a convention, this checkpoint; PR

## Next action
Rewrite the refused-order test in `e2e/checkout.spec.ts` so it arranges its own stock precondition, then run the checks and open the PR.

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
