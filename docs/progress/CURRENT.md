# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-06
- **Phase:** 12 — Cart
- **Branch:** `feature/phase-12-cart`
- **Step:** BRANCHED
- **PR:** none yet
- **Backend pinned at:** `phase-34-complete`. Stack started from the clone on 2026-10-06 (by me); stop it with `docker compose --profile tools down` (no `-v`) when done.
- **Waiting for user:** NO

## Merge verification before this phase
Phase 11 (PR #14, merge `fc320e1`, tag `phase-11-complete` on it): PASS on 2026-10-06: `npm ci && npm run verify` 578/578, `npm run e2e` 310/310. Backend `origin/main` is 18 commits past the pin (KI-040 dead-letter, mvnw.cmd EOL, test flake): nothing for the cart.

## Checklist (from the phase file's "What you'll implement")
- [ ] `src/features/cart/api.ts`: query + add/update/remove; response replaces the cached cart
- [ ] Optimistic quantity change with rollback and `Alert`
- [ ] Add to cart from card and page (anonymous → sign-in → back); "In your cart (n)"; header count from the query
- [ ] Cart page: `CartLine` ("price when added"), `lineTotal`, `OrderSummary` `totalAmount`, remove with 5 s Undo, empty state, checkout disabled when empty
- [ ] Cache rules in `docs/decisions.md`; `docs/modules/cart.md`
- [ ] Tests + E2E; test report; `RECENT.md` rotated (Phase 10 archived); tracker 🔵

## Next action
Read `docs/backend/integration-guide.md` cart sections (`grep -n -i cart`), `design-system/patterns.md` (CartLine, OrderSummary) and the existing header/product card code; write the plan; implement the checklist in order, committing after each item.

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
