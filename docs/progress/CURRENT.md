# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-10
- **Task:** fix KI-025 (the e2e specs that still depend on seeded products and stock by name or by shelf position: `checkout` x2, `orders`, `keyboard-flows`, `catalog`, `design`; the owner said "proceed" with "find products that are in stock; find seeds through search")
- **Branch:** `fix/ki-025-own-test-data` (cut from `main` at `1f584e6`; KI-020 merged, local verify on `main` 904 tests passed, CI on `main` green)
- **Step:** BRANCHED
- **Backend pinned at:** commit `669a9ed1dfcc8ef0d89608c87ef05421bb157fb6` (unchanged by this fix)
- **Waiting for user:** NO

## Checklist
- [ ] Root cause per spec: which seeded name, stock level or shelf position each one assumes
- [ ] Shared live-data helpers in `e2e/` (catalogue across pages, picks by stock and price, account, cart through the API, a product found on the shelf across pages), DRY with KI-020's
- [ ] `checkout` (confirmed purchase, cancelled order), `orders`, `keyboard-flows`, `catalog`, `design` arrange or discover their own data, same assertions
- [ ] typecheck, lint, format; `playwright --list`; full `npm ci && npm run verify`
- [ ] Docs: KNOWN_ISSUES (KI-025 Fixed, or narrowed), decisions only if the convention changes, this checkpoint; PR

## Next action
Write the shared helper module in `e2e/`, move KI-020's `allProducts`/`productWithFewestInStock`/`putInCart` into it, then rework each spec in the checklist.

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
