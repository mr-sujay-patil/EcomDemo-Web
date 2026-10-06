# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-06
- **Phase:** 11 — Authentication
- **Branch:** `feature/phase-11-auth`
- **Step:** BRANCHED
  (NOT_STARTED | PREFLIGHT | BRANCHED | PLANNING | IMPLEMENTING | TESTING | PR_OPEN | VERIFYING | WAITING_FOR_USER)
- **PR:** none yet
- **Backend pinned at:** `phase-34-complete`. Use a running `ecomdemo-gateway-service` if there is one.
- **Waiting for user:** no

## Merge verification before this phase
Phase 10 (PR #13, merge `b04eb29`): PASS on 2026-10-06. PR MERGED; branch tip `3d4d7ff` is an ancestor of `origin/main`; diff empty; branch kept; `npm ci && npm run verify` 450/450; browser E2E 273/273 against the running gateway; CI green on the PR head and on `main` (exact tag, `api:check` included); tag `phase-10-complete` pushed. ⚠️ `npm run e2e` locally stops at `api:check`: the backend team's running stack serves a `dltTimestamp` field on an admin dead-letter response that is not in `phase-34-complete` or on backend `origin/main` (their unreleased work); the snapshot was not changed. The tag was pushed before that was seen: a process slip, the verification above is what stands.
Backend sync (standing rule): `origin/main` unchanged (6 test/line-ending commits past the pin), no newer tag; pin unchanged.

## Checklist (from the phase file's "What you'll implement")
- [ ] `src/features/auth/session.ts`: in-memory session (token, `expiresAt`, profile), context, `useSession`; the API client reads it; decide and record reload behaviour (default: signs out, sign-in page says so); never `localStorage`
- [ ] JWT decoded for display only
- [ ] Expiry: warning one minute before; at expiry or any 401: clear, keep route and drafts, go to `/sign-in?next=…`, return after sign-in
- [ ] 403: "Not permitted" page, never a login prompt
- [ ] Guards: `/cart`, `/checkout`, `/orders`, `/orders/:id`, `/account` (CUSTOMER); `/admin/*` (ADMIN)
- [ ] Header: Sign in / first name + menu (My orders, Account, Sign out) / Admin link for ADMIN
- [ ] Sign out: client-side, clears customer data from the query cache
- [ ] Login 429 + `Retry-After`: the sign-in form shows the wait (countdown, no auto-retry)
- [ ] Remove Phase 10's placeholder message; `docs/architecture/auth-flow.md`, `docs/modules/auth.md`
- [ ] Tests (guards with `next`, 401 mid-session keeps the draft, expiry warning with fake timers, 403 page, sign-out clears cache, 429 wait); E2E; docs, test report, `RECENT.md` rotated (Phase 09 archived), tracker 🔵

## Next action
Read `docs/architecture/{routing,state,api-layer}.md`, the guide's authentication section, `src/api/client.ts` (`setAccessTokenProvider`), `src/api/access.ts`, then plan (tests first) and build the session. Login failures are throttled per client address (20 per 15 min on this machine): never loop wrong-password E2E; the 429 E2E is stubbed.

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
