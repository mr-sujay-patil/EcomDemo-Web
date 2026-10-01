# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-01
- **Phase:** 7 — Typed API Client
- **Branch:** `feature/phase-07-api-client`
- **Step:** IMPLEMENTING
  (NOT_STARTED | PREFLIGHT | BRANCHED | PLANNING | IMPLEMENTING | TESTING | PR_OPEN | VERIFYING | WAITING_FOR_USER)
- **PR:** not yet
- **Backend pinned at:** `phase-33-complete`. Needs the stack up for `api:snapshot`, `api:check`, `e2e`: if `ecomdemo-gateway-service` is running use it, else start it from the clone and stop it after (never `-v`).
- **Waiting for user:** NO

## Merge verification before this phase
Phase 6 (PR #8, merge `98465e2`): PASS on 2026-10-01. PR MERGED; branch tip `52e51c9` is an ancestor of `origin/main`; `git log` and `git diff --stat` empty; branch kept; `npm ci && npm run verify` 38/38 and `npm run e2e` 206/206 on `main` against `phase-33-complete`; tag `phase-06-complete` pushed. Tracker ✅ is this branch's first commit.

## Checklist (from the phase file's "What you'll implement")
- [ ] `npm run api:snapshot` → `api/openapi/<service>.json` (5 services, pretty, key-sorted), own commit `chore(api): regenerate from backend phase-33-complete`
- [ ] `npm run api:generate` → `src/api/generated/<service>.ts`
- [ ] `npm run api:check` (live vs snapshot, fails on any diff); first step of `npm run e2e`
- [ ] `src/api/client.ts`: one openapi-fetch client per service on `/api`; middleware: Bearer from an injected provider (empty now), new `X-Correlation-Id` per request, failures → `ApiError { status, message, correlationId, retryAfter? }`
- [ ] Field-error helper (split 400 `message` on `"; "`, match leading field name; guide section 4)
- [ ] Retry policy in one place (no mutation retry; GET once on 429 after back-off/`Retry-After`; GET once on network error; no other 4xx)
- [ ] Access rules from the guide's tables (web KI-011)
- [ ] Replace Phase 1's hand-written type; MSW handlers typed from the generated types
- [ ] Tests: 400 fields, 401, 403, 404, 409, 429 (GET retried once), 500 (correlation id kept), network failure; `api:check` fails on a changed snapshot
- [ ] Done when: a field renamed in a snapshot fails `npm run verify` at compile time (shown, reverted); `api:check` passes
- [ ] Testing protocol → `docs/test-reports/phase-07.md`; `docs/architecture/api-layer.md`; README, `decisions.md`, `RECENT.md` rotated (Phase 05 to archive), tracker 🔵 → PR → STOP

## Next action
Read `docs/backend/integration-guide.md` section 4 (errors) and the phase-33 delta (`docs/backend/phase-33-delta.md`: login 429 + `Retry-After` is documented on the customer document), find the five document URLs through the gateway, then add `openapi-typescript` and `openapi-fetch` (exact, latest stable).

## ⚠️ Environment notes (this machine)
- One backend stack at a time: if `ecomdemo-gateway-service` is running, use it.
- The repo folder is `~/projects/ecomdemo-web` (lowercase), not `~/projects/EcomDemo-Web` as the docs say; relative paths still work.
- Node v24.21.0 via nvm in WSL, loaded only by interactive shells (`~/.bashrc`). Non-interactive commands must `. ~/.nvm/nvm.sh` first, or `npm` resolves to the Windows install under `/mnt/c`.
- Root `ecomdemo-frontend-integration-guide.md` is an untracked duplicate of `docs/backend/integration-guide.md` (owner's choice); leave it.
- Claude Code runs on Windows: run git/gh/npm in WSL. `wsl.exe -- bash -lc "…"` expands `$vars` in the outer shell first, so put multi-step commands in a script file and run `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash /mnt/c/…/script.sh` (Git Bash on the UNC path hits "dubious ownership"; `gh` is only in WSL). Redirect the script's output to a file in WSL and `cat` it, or lines get mangled. The Chrome extension blocks localhost: use headless Chrome (`--dump-dom`, `--enable-logging=stderr`).
- `~/.cache/ms-playwright` already holds `chromium-1243` and `chromium_headless_shell-1243`.

## ⚠️ Carried, not fixed (oldest first)
-
