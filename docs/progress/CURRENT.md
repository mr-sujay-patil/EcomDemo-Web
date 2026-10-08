# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-08
- **Phase:** 23 — Observability
- **Branch:** `feature/phase-23-observability`
- **Step:** IMPLEMENT
- **PR:** none yet
- **Backend pinned at:** commit `f088fd4f517cceda44e478c9ca3ba8d5de1f8c68` (backend `main`, tag `ki-011-fixed`). No stack runs now: start it from `../ecomdemo-backend-readonly` with `CUSTOMER_DB_PORT=15435 docker compose up --build --wait -d` (Windows app SignalRgb holds 5435); stop it at the end with `docker compose --profile tools down` (no `-v`; the volumes' stock is used up: web KI-020).
- **Waiting for user:** no. The phase's manual step: stop and restart one backend service for the failure test (ask first). Carried: the screen-reader pass, `E2E_ADMIN_*`, relaying KI-019/020/021/022/024/025, web KI-027, 028, 029, **030 (shelf not paged), 031 (503 Retry-After)**. Owner decisions pending: reconcile CLAUDE.md workflow rules 9/10/3/5 with the hard rules; branch protection settings on `main`.

## Merge verification before this phase
Phase 22 (PR #27, merge `165402d`, tag `phase-22-complete`): tip in `main`; `npm ci && npm run verify` exit 0 (855); CI on `main` green incl. publish. Chores since: PR #28 (pin `f088fd4`), #29 (CI speed: backend image cache, verify/e2e on pull requests only, `backend-images.yml`), #30 (CLAUDE.md workflow rules). Backend sync (2026-10-08): `origin/main` `33d6f1a`, 3 commits past the pin, all backend CI/workflow rules; nothing for the web; pin stays.

## Checklist (from the phase file's "What you'll implement")
- [x] Error boundaries: root page, route boundary (layout stays), router `errorElement`s, unhandled-rejection alert (once); `ErrorReference` with Copy
- [x] The reference is the `X-Correlation-Id` (a render error gets a fresh id, console only)
- [x] OpenTelemetry Web: `src/app/tracing.ts`, `traceparent` on `/api` only, no exporter (optional dev OTLP not done: not published for browsers, would need a backend change)
- [x] Web Vitals in dev (`src/app/webVitals.ts`), recorded in the test report
- [x] `docs/troubleshooting.md` with a worked example from a real failure
- [x] E2E: `e2e/observability.spec.ts`, `scripts/e2e-service-down.sh` (`npm run e2e:service-down`)
- [ ] Done-when, second half: the reference finds the **gateway's log line**: NOT possible at the pinned backend (gateway writes no request log): web KI-032, backend KI-035; message for the backend team in the PR
- [ ] PR; CI green; the owner's review; then `v1.0` after the merge (the phase file says tag `v1.0`)

## Next action
Wait for the owner's review of the Phase 23 PR. On `approved, merge it`: confirm CI green on the PR head, `gh pr merge <n> --merge` (no `--delete-branch`), verify `main` (`npm ci && npm run verify`; CI on `main`; the phase file says to tag `v1.0` after this phase, in addition to `phase-23-complete`: ask the owner before tagging `v1.0`). The backend stack is RUNNING (commit `f088fd4`, Alloy recreated with a local override in the scratchpad so logs reach Loki): stop it with `docker compose --profile tools down` (no `-v`) when done. Next phase only on `continue`.

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
