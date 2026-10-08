# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-08
- **Phase:** 19 — Containerization
- **Branch:** `feature/phase-19-docker`
- **Step:** PR_OPEN
- **PR:** #24 (CI green on the pushed head: verify, e2e, image; publish skipped on a PR by design)
- **Backend pinned at:** `phase-34-complete`. No stack runs now: start it from `../ecomdemo-backend-readonly` with `CUSTOMER_DB_PORT=15435 docker compose up --build --wait -d` (Windows app SignalRgb holds 5435) and stop it at the end with `docker compose --profile tools down` (no `-v`).
- **Waiting for user:** YES: review of the Phase 19 PR; reply `approved, merge it` to merge. Carried: the manual screen-reader pass (`docs/accessibility.md`), the `E2E_ADMIN_*` credentials, relay web KI-019/020/021/022 (and KI-024 before any pin move) to the backend team, decide on `chore/pin-backend-<tag>`.

## Merge verification before this phase
Phase 18 (PR #22, merge `640d11c`, tag `phase-18-complete`; PR #23 Dependabot merged by the owner as `171a218`): all branch commits in `main`; `npm ci && npm run verify` exit 0 on `main` (827 tests); `npm run e2e` on `main` 1004 passed + web KI-020. Backend sync 2026-10-08: `origin/main` is 46 commits past the pin; new KI-007 (paged `GET /api/products`) recorded as web KI-024; pin stays `phase-34-complete`.

## Checklist (from the phase file's "What you'll implement")
- [x] `Dockerfile`: node 24.21.0-alpine builder, nginx 1.30.5-alpine-slim final (digests pinned), non-root, `HEALTHCHECK /healthz`
- [x] `nginx/default.conf.template`: SPA fallback, `/api/` proxy (Host kept, long timeouts, 16 MB bodies), `/healthz`, immutable assets, no-cache index, gzip, `server_tokens off`
- [x] `.dockerignore`; `compose.yaml` (only `web`, external backend network via `BACKEND_NETWORK`)
- [x] `npm run e2e:docker` (985 pass, 1 fails: web KI-020); `e2e/container.spec.ts` (8)
- [x] CI: `image` job on PRs, `publish` job to GHCR on `main` (publish unproven until the merge)
- [x] docs (README, development-environment, decisions, KNOWN_ISSUES KI-024), test report, RECENT rotated

## Next action
Wait for the owner's review. The backend stack is STOPPED (started from the clone with `CUSTOMER_DB_PORT=15435`, taken down without `-v`); the merge verification needs it again. On `approved, merge it`: wait for CI to pass on the PR head and read it (the new `image` job especially), `gh pr merge <n> --merge` (no `--delete-branch`); then READ the `publish` run on `main` and check the image exists in GHCR (Settings → Actions permissions, or package visibility, are the usual failures); merge verification on `main` (`npm ci && npm run verify`, `npm run e2e:docker` with the stack up, read the result before tagging); tag `phase-19-complete`; stop the stack. The first commit of the next branch updates the tracker row (19 ✅) and this file. Before the next phase: fetch the backend clone and compare with the pin. Next phase only on `continue`: Phase 20 (read its file first).

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
