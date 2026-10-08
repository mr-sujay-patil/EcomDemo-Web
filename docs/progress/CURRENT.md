# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-08
- **Phase:** 15 — Semantic Search
- **Branch:** `feature/phase-15-search`
- **Step:** PR_OPEN
- **PR:** #19 (CI running on the head)
- **Backend pinned at:** `phase-34-complete`. No stack runs now: start it from `../ecomdemo-backend-readonly` (`docker compose up --build --wait`) and stop it at the end with `docker compose --profile tools down` (no `-v`).
- **Waiting for user:** YES: review of the Phase 15 PR; relay web KI-019 and KI-020 to the backend team

## Merge verification before this phase
Phase 14 (PR #18, merge `8cf2be8`, tag `phase-14-complete`): CI `verify` and `e2e` green on the PR; on `main` `npm run verify` 662/662 tests, `npm run e2e` 310/310 against the pinned stack (KI-020's spec passed on the fresh stack). Backend sync 2026-10-08: `origin/main` is past the pin by KI-002/040/044/045/046 fixes and docs, plus a comment-only edit in `ProductIndexer`; nothing changes the search contract. Pin stays `phase-34-complete`.

## Checklist (from the phase file's "What you'll implement")
- [x] Header search box: ~300 ms debounce, top-5 suggestions, Enter goes to `/search?q=…`
- [x] `/search` page: `GET /api/products/search` (q ≤ 200, category, minPrice, maxPrice, limit 1-20); query and filters in the URL; results in returned order; no similarity shown
- [x] 503: info `Alert` + client-side fallback over the loaded catalogue (name, description); the page says which mode it used
- [x] Stale requests cancelled via the query's `signal`
- [x] `docs/modules/search.md`
- [x] Tests: debounce (fake timers), URL state, stale-response cancellation, 503 fallback; E2E additions (`e2e/`)

## Next action
Wait for the owner's review. On `approved, merge it`: wait for CI, `gh pr merge 19 --merge` (no `--delete-branch`); merge verification on `main` (`npm ci && npm run verify`; start the stack with `CUSTOMER_DB_PORT=15435 docker compose up --build --wait -d` in `../ecomdemo-backend-readonly` because Windows app SignalRgb holds 5435, run `npm run e2e`, read the result before tagging); tag `phase-15-complete`; stop the stack (`docker compose --profile tools down`, no `-v`). The first commit of the next branch updates the tracker row (15 ✅) and this file. Before the next phase: fetch the backend clone and compare with the pin. Next phase only on `continue`: Phase 16 (read its file first). Manual check for the owner: the suggestions list with a screen reader (see the report, section 5).

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
