# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-01
- **Phase:** chore: pin the backend to `phase-33-complete` (between Phase 5 and Phase 6)
- **Branch:** `chore/pin-backend-phase-33`
- **Step:** TESTING
  (NOT_STARTED | PREFLIGHT | BRANCHED | PLANNING | IMPLEMENTING | TESTING | PR_OPEN | VERIFYING | WAITING_FOR_USER)
- **PR:** not yet
- **Backend pinned at:** `phase-33-complete` (clone moved; the running stack on :8080 is NOT ours and still runs `ki-001-fixed`)
- **Waiting for user:** NO

## Merge verification before this work
Phase 5 (PR #5, merge commit `701a9b3`): PASS on 2026-10-01. Branch tip `5cf58b5` is an ancestor of `origin/main`; `a768ebf` (a progress-file commit pushed 5 s after the merge) was deliberately dropped by the owner; `npm ci && npm run verify` 6/6 and `npm run e2e` 22/22 on `main` against `ki-001-fixed`; tag `phase-05-complete` pushed. Tracker ✅ is this branch's first commit.

## Scope (owner approved, 2026-10-01)
Move the pin to `phase-33-complete` (docs, CI `BACKEND_TAG` + generated `.env`), record the keep-the-proxy decision, add `docs/backend/phase-33-delta.md`. NOT in scope: the login form, API types (Phases 7 and 11).

## Next action
Push, open the PR, and read the `e2e` job on it: it builds the backend at `phase-33-complete` with the generated signing key and secrets. Ask the owner before replacing the running stack for a local rerun. Then `npm run verify`, write the PR body (fix-style: results in the description), `gh pr ready`, STOP.

## ⚠️ Environment notes (this machine)
- One backend stack at a time: if `ecomdemo-gateway-service` is running, use it.
- The repo folder is `~/projects/ecomdemo-web` (lowercase), not `~/projects/EcomDemo-Web` as the docs say; relative paths still work.
- Node v24.21.0 via nvm in WSL, loaded only by interactive shells (`~/.bashrc`). Non-interactive commands must `. ~/.nvm/nvm.sh` first, or `npm` resolves to the Windows install under `/mnt/c`.
- Root `ecomdemo-frontend-integration-guide.md` is an untracked duplicate of `docs/backend/integration-guide.md` (owner's choice); leave it.
- Claude Code runs on Windows: run git/gh/npm in WSL. `wsl.exe -- bash -lc "…"` expands `$vars` in the outer shell first, so put multi-step commands in a script file and run `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash /mnt/c/…/script.sh` (Git Bash on the UNC path hits "dubious ownership"; `gh` is only in WSL). Redirect the script's output to a file in WSL and `cat` it, or lines get mangled. The Chrome extension blocks localhost: use headless Chrome (`--dump-dom`, `--enable-logging=stderr`).
- `~/.cache/ms-playwright` already holds `chromium-1243` and `chromium_headless_shell-1243`.

## ⚠️ Carried, not fixed (oldest first)
-
