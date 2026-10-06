# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-06
- **Phase:** none — chore `chore/pin-backend-phase-34` (re-pin the backend; requested by the user)
- **Branch:** `chore/pin-backend-phase-34`
- **Step:** WAITING_FOR_USER
- **PR:** (number in the PR itself; see `gh pr list`)
- **Backend pinned at:** `phase-34-complete` (backend PR #59). Use a running `ecomdemo-gateway-service` if there is one.
- **Waiting for user:** YES: review of the chore PR

## Merge verification before this chore
Phase 8 (PR #10, merge `878fdff`): PASS on 2026-10-06. Branch tip `286c698` is an ancestor of `origin/main`; diff empty; branch kept; `npm run verify` 187/187 and `npm run e2e` 229/229 (`api:check` green) on `main` against `phase-33-complete`; CI green; tag `phase-08-complete` pushed.

## Checklist
- [x] CI `BACKEND_TAG` default, README, `development-environment.md` moved to `phase-34-complete`
- [x] `api:snapshot` + `api:generate`: only `imageUrl` and `GET /api/products/{id}/image` added
- [x] Fixtures, the contract test's key list and the access rule (`anyone`) updated for them
- [x] `docs/backend/phase-34-delta.md`, `decisions.md`, KI-002 row, integration-guide `ProductResponse` line
- [x] `npm run verify` 188/188 (twice); `npm run e2e` 229/229, `api:check` green, against the backend team's stack (`phase-34-complete` + 2 commits, see below)
- [ ] CI green on the PR head; owner's review

## Next action
Confirm CI is green on the chore PR, then wait for the owner. On `approved, merge it`: `gh pr merge <n> --merge` (no `--delete-branch`), verify on `main` (verify + e2e), tag `chore-pin-backend-phase-34-complete` only if the owner wants one (the Phase 33 chore had none; check `git tag`). Then Phase 9 only on `continue`: read `docs/phases/phase-09-design-system.md` and `design-system/` first; its Requires (KI-002 decision) is now met: use `imageUrl` per `docs/backend/phase-34-delta.md`.

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
