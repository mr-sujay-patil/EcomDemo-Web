# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-06
- **Phase:** 10 — Forms and Validation
- **Branch:** `feature/phase-10-forms`
- **Step:** WAITING_FOR_USER
  (NOT_STARTED | PREFLIGHT | BRANCHED | PLANNING | IMPLEMENTING | TESTING | PR_OPEN | VERIFYING | WAITING_FOR_USER)
- **PR:** #13 (CI running on the head)
- **Backend pinned at:** `phase-34-complete`. Use a running `ecomdemo-gateway-service` if there is one.
- **Waiting for user:** YES: review of the Phase 10 PR (no manual steps)

## Merge verification before this phase
Phase 9 (PR #12, merge `bcb6492`): PASS on 2026-10-06 (first commit of this branch). Backend sync: `origin/main` six test/line-ending commits past `phase-34-complete`; pin unchanged.

## Checklist (from the phase file's "What you'll implement")
- [x] Form kit `src/components/forms/`: `Form`, `Field`, `FormError` (+ `SubmitButton`, `applyServerErrors`)
- [x] Zod schemas mirroring the backend rules (register, login, profile)
- [x] Register page: 400 on fields, 409 on username, 201 to `/sign-in` with the name and a note
- [x] Sign-in page: 401 "Wrong username or password."; success note (token dropped; Phase 11)
- [x] Validate on blur then change; focus first invalid; loading, no double submit; Show/Hide
- [x] Store-voice copy; tests (schemas, server mapping, focus, no double submit)
- [x] E2E: register, 409, short password, real 400 mapped, wrong password, sign in
- [x] Docs: `forms.md`, `modules/accounts.md`, routing table, README, `decisions.md`, KI-017 and KI-018 (fixed here), test report + screenshots, `RECENT.md` rotated (Phase 08 archived), tracker 🔵
- [x] `npm run verify` 450 tests, coverage 99.54 / 96.12 / 100 / 100, `npm run e2e` 273/273

## Next action
Confirm CI is green on the PR head. Then wait for the owner's review. On `approved, merge it`: `gh pr merge <n> --merge` (no `--delete-branch`), merge verification on `main` (`npm ci && npm run verify`, `npm run e2e` against the running gateway; mind the login throttle: the suite fails one real sign-in per run), tag `phase-10-complete`. Before the next phase: `git fetch` the backend clone and compare `origin/main` with the pin; backend doubts go to the owner as a forwardable message. Next phase only on `continue`: Phase 11 (read its file first; it builds the throttled-login countdown, `docs/backend/phase-33-delta.md`).

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
