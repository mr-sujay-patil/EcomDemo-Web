# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-10
- **Task:** fix KI-020 (`e2e/checkout.spec.ts` "a quantity above stock is refused up front" needs the seeded Laptop Sleeve 16" at stock 2; on a used backend it is 0 and the spec times out)
- **Branch:** `fix/ki-020-own-stock` (cut from `main` at `7eb65c5`; KI-028 merged, CI on `main` green)
- **Step:** TESTING
- **Backend pinned at:** commit `669a9ed1dfcc8ef0d89608c87ef05421bb157fb6` (unchanged by this fix)
- **Waiting for user:** no

## Checklist
- [x] Root cause, with evidence: the spec named Laptop Sleeve 16" and its seeded level 2 (shelf add, two Increase clicks, "available 2", "Lower to 2")
- [x] Regression check: the spec itself, arranging its own precondition (works on a fresh and on a used backend)
- [x] Fix: `productWithFewestInStock` (live catalogue, every page) + `putInCart` (API), then one Increase in the UI; same assertions
- [x] `npm ci && npm run verify` (904 unit tests, 74 files); typecheck, lint, format clean; `playwright --list` sees the 4 checkout tests. The e2e spec runs only in CI's `e2e` job (no backend stack in this container)
- [ ] Docs: KNOWN_ISSUES (Fixed, PR #n), `[Fix KI-020] Decision`, this checkpoint; PR

## Next action
Open the PR (`Fix KI-020: …`), add its number to the KI-020 row, then wait for CI (the `e2e` job is the real run of the spec) and STOP for the owner's `approved, merge it`. After the merge: local `npm ci && npm run verify` on `main`, CI on `main` green, tag `ki-020-fixed` (tag pushes are refused here with 403: give the owner the command).

## ⚠️ Environment notes (this machine)
- The backend team's own stack (`~/projects/ecomdemo`, compose project `ecomdemo`) was running on 2026-10-06 and reported `phase-34-complete-2-g40fed61` (two commits past the tag). Its API matched the tag (snapshots differ only by `imageUrl` and the image path). Never stop or touch it; starting the clone's stack fails on the container names while it runs.
- One backend stack at a time: if `ecomdemo-gateway-service` is running, use it.
- The repo folder is `~/projects/ecomdemo-web` (lowercase), not `~/projects/EcomDemo-Web` as the docs say; relative paths still work.
- Node v24.21.0 via nvm in WSL, loaded only by interactive shells (`~/.bashrc`). Non-interactive commands must `. ~/.nvm/nvm.sh` first, or `npm` resolves to the Windows install under `/mnt/c`.
- Root `ecomdemo-frontend-integration-guide.md` is an untracked duplicate of `docs/backend/integration-guide.md` (owner's choice); leave it.
- Claude Code runs on Windows: run git/gh/npm in WSL. `wsl.exe -- bash -lc "…"` expands `$vars` in the outer shell first, so put multi-step commands in a script file and run `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash /mnt/c/…/script.sh` (Git Bash on the UNC path hits "dubious ownership"; `gh` is only in WSL). Redirect the script's output to a file in WSL and `cat` it, or lines get mangled. The Chrome extension blocks localhost: use headless Chrome (`--dump-dom`, `--enable-logging=stderr`).
- `~/.cache/ms-playwright` already holds `chromium-1243` and `chromium_headless_shell-1243`.

## ⚠️ Carried, not fixed (oldest first)
- The other two `e2e/checkout.spec.ts` tests (and `orders`, `keyboard-flows`) still buy seeded products by name: KI-025's general form, not this fix.
- The backend stack running here (`ecomdemo-gateway-service`) is ahead of the pin: `npm run e2e` stops at `api:check` (dead-letter admin schema `dltTimestamp`). Run `npx playwright test --project=chromium` and say so, or have the owner approve a `chore/pin-backend-<tag>`.
