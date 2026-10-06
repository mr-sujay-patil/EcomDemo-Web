# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-06
- **Phase:** 10 — Forms and Validation
- **Branch:** `feature/phase-10-forms`
- **Step:** BRANCHED
  (NOT_STARTED | PREFLIGHT | BRANCHED | PLANNING | IMPLEMENTING | TESTING | PR_OPEN | VERIFYING | WAITING_FOR_USER)
- **PR:** none yet
- **Backend pinned at:** `phase-34-complete`. Use a running `ecomdemo-gateway-service` if there is one.
- **Waiting for user:** no

## Merge verification before this phase
Phase 9 (PR #12, merge `bcb6492`): PASS on 2026-10-06. PR MERGED; branch tip `b7e8466` is an ancestor of `origin/main`; diff empty; branch kept; `npm ci && npm run verify` 362/362 (`check:tokens` clean) and `npm run e2e` 247/247 (`api:check` green) on `main` against `phase-34-complete`; CI green on the PR head and on `main`; tag `phase-09-complete` pushed. Tracker ✅ is this branch's first commit.
Backend sync (standing rule): `origin/main` is 6 commits past `phase-34-complete`, all test and line-ending fixes (backend KI-045, KI-046); no API change, no newer tag; pin unchanged.

## Checklist (from the phase file's "What you'll implement")
- [ ] Form kit `src/components/forms/`: `Form`, `Field` (binds `TextField`), `FormError`
- [ ] Zod schemas mirroring the backend rules (register, login, profile); `z.infer` types
- [ ] Register page: `POST /api/customers/register`; 400 field errors on their fields; 409 on username; 201 to `/sign-in` with the username and a note
- [ ] Sign-in page: `POST /api/auth/login`; 401 "Wrong username or password"; success note (token not kept; Phase 11)
- [ ] Behaviour: validate on blur then change; focus first invalid; loading, no double submit; show/hide password
- [ ] Store-voice copy; tests (schemas, server error mapping, focus, no double submit)
- [ ] E2E: register a generated username; register again (409); short password; wrong password; sign in
- [ ] Docs: module page, routing table, README, `decisions.md`, test report, `RECENT.md` rotated (Phase 08 archived), tracker 🔵

## Next action
Install `react-hook-form`, `zod`, `@hookform/resolvers` (latest stable, exact), then build the form kit and schemas (tests first), then the two pages. Remember: login failures are throttled per client address (20 per 15 min on this machine): keep wrong-password E2E to one case, distinct usernames; the 429 countdown is Phase 11 (`docs/backend/phase-33-delta.md`).

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
