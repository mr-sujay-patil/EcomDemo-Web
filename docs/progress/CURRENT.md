# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-09
- **Task:** chore: move the backend pin to commit `82ef5989594c30330850594f388967b8f080ce8a` (backend `main`, `ki-049-fixed`; the owner added `REDIS_PASSWORD` to the clone's `.env` and said to proceed)
- **Branch:** `chore/pin-backend-82ef598`
- **Step:** PR_OPEN (see `gh pr list`)
- **Backend pinned at:** the commit above. The stack runs with `bash scripts/backend-stack.sh up` (needs `REDIS_PASSWORD` in the clone's `.env`); it is STOPPED now (never `down -v`).
- **Waiting for user:** review and `approved, merge it` for the pin PR. After the merge: dispatch **Actions > Backend images > Run workflow** (or `gh workflow run "Backend images"`) so the cache exists for the new commit; verify `main`; no tag for a chore.
- Phase 22 and 23 and KI-030/031 are merged and tagged. Open: owner decisions (CLAUDE.md rule conflicts, branch protection), KI-032 to relay, KI-033 (perf budget borderline), flakes KI-026/028/029, KI-020/025 (specs assume seed stock; the local volumes are drained).

## Results at the new pin
Backend quick checks at `82ef598`: `size=2` gives 200 + `X-Total-Count` + `Link`, `size=101` gives 400, `/actuator/health` gives 401. `api:check`: matches all 5 snapshots (no contract change, nothing regenerated). `npm run verify`: 889 passed. `npm run e2e:docker`: 989 passed, 4 failed, 1 skipped: 3 stock (KI-020) + the KI-028 visual flake (passes alone, twice).

## Next action
Wait for CI on the PR: the `e2e` job builds the backend at the new commit with a generated `REDIS_PASSWORD` (first real test of that step; it cannot use the image cache, keyed on the old commit).

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
