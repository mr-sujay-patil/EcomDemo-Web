# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-10
- **Task:** Phase 24: Guest Cart (web KI-012, approved by the user on 2026-10-10), `docs/phases/phase-24-guest-cart.md`
- **Branch:** `feature/phase-24-guest-cart` (cut from `main` at `8c2d000`; KI-025 merged as PR #43, CI on `main` green, local `npm ci && npm run verify` on `main` 904 tests passed in this session; tags `ki-020-fixed` and `ki-025-fixed` still to push by the owner, 403 here)
- **Step:** BRANCHED
- **Backend pinned at:** commit `669a9ed1dfcc8ef0d89608c87ef05421bb157fb6` (unchanged; this phase needs no backend change)
- **Waiting for user:** no

## Checklist
- [ ] Decisions recorded (`[Phase 24]` in `docs/decisions.md`): what is stored, storage and key, validation, signed-out screens, replay and partial failure, merge, clearing, sign-out, tabs
- [ ] Guest cart store (`localStorage`, versioned key, validated reads, in-memory fallback, `storage` event) with unit tests
- [ ] Signed-out Add to cart (shelf, product page, search) and the header count use the guest cart
- [ ] `/cart` signed out: the guest cart page (current prices by id, loading, empty, error, removed product, stock hint, Sign in to check out)
- [ ] Replay on sign-in (per-line POST, Web Locks, partial failure, Try again, cart re-read) and its notice, with tests
- [ ] E2E: `e2e/guest-cart.spec.ts`; the guest cart screen in `e2e/screens.ts`; specs that expected sign-in on a signed-out add updated
- [ ] Full `npm ci && npm run verify`; test report `docs/test-reports/phase-24.md`; README, `docs/modules/cart.md`, architecture state; `RECENT.md` summary and rotation; tracker 🔵
- [ ] PR opened

## Next action
Write the `[Phase 24]` decisions, then build `src/features/cart/guestCart.ts` (pure parse and update functions) and its store with unit tests.

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
