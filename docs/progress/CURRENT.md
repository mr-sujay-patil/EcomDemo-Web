# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-10
- **Task:** fix KI-025 (the e2e specs that still depend on seeded products and stock by name or by shelf position: `checkout` x2, `orders`, `keyboard-flows`, `catalog`, `design`; the owner said "proceed" with "find products that are in stock; find seeds through search")
- **Branch:** `fix/ki-025-own-test-data` (cut from `main` at `1f584e6`; KI-020 merged, local verify on `main` 904 tests passed, CI on `main` green)
- **Step:** PR_OPEN (PR #43)
- **Backend pinned at:** commit `669a9ed1dfcc8ef0d89608c87ef05421bb157fb6` (unchanged by this fix)
- **Waiting for user:** YES: CI on PR #43 (its `e2e` job is the real run of these specs), then `approved, merge it`

## Checklist
- [x] Root cause per spec: `checkout` (Desk Mat, 2 Mechanical Keyboards), `orders` (2 keyboards), `keyboard-flows` (Desk Mat), `catalog` (ten seeded names on page 1), `design` (ids 1 and 9, page 1), `shelf` (Accessories, Audio, ids 1 and 4, Mechanical Keyboard on page 1), `observability` (Mechanical Keyboard on page 1)
- [x] Shared helpers in `e2e/live-data.ts` (KI-020's moved there): `allProducts`, `productToBuy`, `orderOverTheLimit`, `productWithFewestInStock`, `putInCart`, `createAccount`, `findOnShelf`, `everyShelfCard`, `shelfCount`
- [x] Every spec above arranges or finds its own data; same assertions (stronger in `catalog` and `shelf`: every product, exact prices)
- [x] typecheck, lint, format; `playwright --list` (39 tests in the 7 files); a scratch run against a 60-product stand-in gateway with the preinstalled Chromium 1194 (24 passed: `catalog`, `design`, `shelf`, `observability`; `findOnShelf` by click and keyboard to page 3). Specs needing accounts, cart and orders run only in CI's `e2e` job
- [x] Full `npm ci && npm run verify` (904 unit tests, 74 files); docs (KNOWN_ISSUES Fixed (PR #43), `[Fix KI-025] Decision`); PR #43
- [ ] CI green on PR #43

## Next action
Wait for CI on PR #43 and fix it if red (the `e2e` job is the real run of these specs), then STOP for the owner's `approved, merge it`. After the merge: local `npm ci && npm run verify` on `main`, CI on `main` green, tag `ki-025-fixed` (tag pushes are refused here with 403: give the owner the command).

## ⚠️ Environment notes (this machine)
- The backend team's own stack (`~/projects/ecomdemo`, compose project `ecomdemo`) was running on 2026-10-06 and reported `phase-34-complete-2-g40fed61` (two commits past the tag). Its API matched the tag (snapshots differ only by `imageUrl` and the image path). Never stop or touch it; starting the clone's stack fails on the container names while it runs.
- One backend stack at a time: if `ecomdemo-gateway-service` is running, use it.
- The repo folder is `~/projects/ecomdemo-web` (lowercase), not `~/projects/EcomDemo-Web` as the docs say; relative paths still work.
- Node v24.21.0 via nvm in WSL, loaded only by interactive shells (`~/.bashrc`). Non-interactive commands must `. ~/.nvm/nvm.sh` first, or `npm` resolves to the Windows install under `/mnt/c`.
- Root `ecomdemo-frontend-integration-guide.md` is an untracked duplicate of `docs/backend/integration-guide.md` (owner's choice); leave it.
- Claude Code runs on Windows: run git/gh/npm in WSL. `wsl.exe -- bash -lc "…"` expands `$vars` in the outer shell first, so put multi-step commands in a script file and run `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash /mnt/c/…/script.sh` (Git Bash on the UNC path hits "dubious ownership"; `gh` is only in WSL). Redirect the script's output to a file in WSL and `cat` it, or lines get mangled. The Chrome extension blocks localhost: use headless Chrome (`--dump-dom`, `--enable-logging=stderr`).
- `~/.cache/ms-playwright` already holds `chromium-1243` and `chromium_headless_shell-1243`.

## ⚠️ Carried, not fixed (oldest first)
- The backend stack running here (`ecomdemo-gateway-service`) is ahead of the pin: `npm run e2e` stops at `api:check` (dead-letter admin schema `dltTimestamp`). Run `npx playwright test --project=chromium` and say so, or have the owner approve a `chore/pin-backend-<tag>`.
- Tag `ki-020-fixed` is not pushed (tag pushes are refused here with 403): the owner runs `git tag ki-020-fixed 1f584e6 && git push origin ki-020-fixed`.
