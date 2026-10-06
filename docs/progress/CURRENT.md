# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-06
- **Phase:** 11 — Authentication
- **Branch:** `feature/phase-11-auth`
- **Step:** WAITING_FOR_USER
  (NOT_STARTED | PREFLIGHT | BRANCHED | PLANNING | IMPLEMENTING | TESTING | PR_OPEN | VERIFYING | WAITING_FOR_USER)
- **PR:** #14 (CI running on the head)
- **Backend pinned at:** `phase-34-complete`. No stack runs now (I started one from the clone for this phase and stopped it, no `-v`): start it from `../ecomdemo-backend-readonly` for the merge verification.
- **Waiting for user:** YES: review of the Phase 11 PR (no manual steps)

## Merge verification before this phase
Phase 10 (PR #13, merge `b04eb29`): PASS on 2026-10-06 (first commit of this branch; the `dltTimestamp` mismatch seen then was the backend team's unreleased work, and `api:check` matched on the pinned stack in this phase).

## Checklist (from the phase file's "What you'll implement")
- [x] In-memory session behind a context and `useSession`; the API client reads it; reload signs out (decided and recorded); never storage
- [x] JWT not decoded: `expiresAt` and `/api/customers/me`
- [x] Expiry: warning at -60 s; at expiry or any 401 (with a token): clear, keep route and drafts, `/sign-in?next=…`, return
- [x] 403 "Not permitted", never a login prompt
- [x] Guards: customer routes and `/admin/*`
- [x] Header: Sign in / first name + menu / Admin for ADMIN
- [x] Sign out: client-side, clears cached customer data
- [x] Login 429 + `Retry-After`: countdown on the button
- [x] Phase 10's placeholder removed; `auth-flow.md`, `modules/auth.md`
- [x] Tests (guards with `next`, 401 keeps the draft, expiry with fake timers, 403 page, sign-out clears cache, 429 wait); E2E; docs, test report + screenshots, `RECENT.md` rotated (Phase 09 archived), tracker 🔵
- [x] `npm run verify` 578 tests, coverage 99.84 / 96.8 / 100 / 100, `npm run e2e` 310/310 (`api:check` green, exact tag)

## Next action
Confirm CI is green on the PR head. Then wait for the owner's review. On `approved, merge it`: `gh pr merge <n> --merge` (no `--delete-branch`); start the backend stack from the clone; merge verification on `main` (`npm ci && npm run verify`, `npm run e2e`, **read the E2E result before tagging**); tag `phase-11-complete`; stop the stack (no `-v`). Before the next phase: `git fetch` the backend clone and compare `origin/main` and tags with the pin; backend doubts go to the owner as a forwardable message. Next phase only on `continue`: Phase 12 (read its file first; it is the first with authenticated API calls).

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
