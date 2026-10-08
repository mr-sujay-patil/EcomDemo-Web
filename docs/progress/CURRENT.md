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
- [ ] Error boundaries: root (full page, "Reference: …", link home) and per route (layout stays usable); router `errorElement`s use the same components; global unhandled-rejection handler shows the reference `Alert` once
- [ ] The reference is the `X-Correlation-Id` the client sent and the gateway echoed; copy to clipboard
- [ ] OpenTelemetry Web: fetch instrumentation propagating `traceparent` on `/api` only; no third-party exporter; optional dev OTLP only if the backend collector accepts browser traffic (else stop, rule 10)
- [ ] Web Vitals logged in dev, recorded in the test report; no analytics service
- [ ] `docs/troubleshooting.md`: reference on screen to the request in Grafana (Loki by correlation id, Tempo by trace), worked example from a real failure
- [ ] E2E: backend service down shows the reference page; every `/api` request carries `traceparent` and `X-Correlation-Id`

## Next action
Read the integration guide's error/correlation sections, `src/api/client.ts` and `errors.ts`, the router's current error pages; then plan the boundaries.

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
