# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-08
- **Phase:** 22 — Security
- **Branch:** `feature/phase-22-security`
- **Step:** IMPLEMENT
- **PR:** none yet
- **Backend pinned at:** `phase-34-complete`. No stack runs now: start it from `../ecomdemo-backend-readonly` with `CUSTOMER_DB_PORT=15435 docker compose up --build --wait -d` (Windows app SignalRgb holds 5435) and stop it at the end with `docker compose --profile tools down` (no `-v`).
- **Waiting for user:** no. Carried: the screen-reader pass, `E2E_ADMIN_*`, relaying KI-019/020/021/022/024/025, web KI-027 (LCP enforcement), KI-028.

## Merge verification before this phase
Phase 21 (PR #26, merge `97d9892`, tag `phase-21-complete`): branch tip `e7f213a` is an ancestor of `main`; CI on `main` green. Backend sync (2026-10-08): 57 commits past the pin, mostly backend-internal fixes; paged `GET /products` (backend KI-007) is already web KI-025; nothing needed for Phase 22; pin stays `phase-34-complete`.

## Checklist (from the phase file's "What you'll implement")
- [x] nginx security headers via `nginx/security-headers.conf` (included in every location; `/api` hides the gateway's copies); theme script moved to `public/theme-init.js`; zod `jitless` (`src/app/zodConfig.ts`) because its eval probe is a CSP violation
- [x] CI: `npm run audit:deps` (`scripts/audit-deps.mjs` + `audit-allowlist.json`: extract-zip x2, expires 2026-12-31; `overrides` tmp 0.2.7, basic-ftp 6.2.2); Trivy 0.75.0 on the image (fixed pcre2 CVE-2026-103111 with `apk upgrade pcre2`)
- [x] CycloneDX SBOM artifact (`sbom`) from the image job
- [x] `scripts/check-dist.mjs` in `npm run verify`
- [x] E2E: `cspGuard` fixture (securitypolicyviolation) + headers spec in `container.spec.ts`; `zoom.spec.ts` uses `bypassCSP` (injects a user stylesheet)
- [ ] `docs/security.md`, `docs/decisions.md` [Phase 22], KNOWN_ISSUES rows (saga.test flake; stock drained)
- [ ] Push, read CI; proof that CI blocks a pinned vulnerable package (commit it, see it red, revert it); Phase Review Report; PR

## Next action
Write `docs/security.md` and the decisions; push and read CI; add a known-vulnerable pinned package in a throwaway commit, confirm `verify` goes red on the audit step, revert it; then raise the PR and STOP. Local E2E against the container: 983 of 987 pass; the 4 failures were the (now fixed) duplicate nosniff header and 3 specs that need stock the shared backend no longer has (web KI-020: Desk Mat and Laptop Sleeve are at 0 after two full runs; no admin credentials to restock). The compose stack from `../ecomdemo-backend-readonly` is RUNNING (stop it with `docker compose --profile tools down`, no `-v`).

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
