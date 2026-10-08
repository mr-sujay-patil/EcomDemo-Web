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
- [ ] nginx security headers: strict CSP (no unsafe-inline), Referrer-Policy, X-Content-Type-Options, Permissions-Policy, COOP; fix what breaks (theme bootstrap script, inline styles)
- [ ] CI: `npm audit --audit-level=high` and Trivy on the image (findings fixed or suppressed with justification + expiry)
- [ ] CycloneDX SBOM for the image attached to the CI run
- [ ] Check that `dist/` has no secrets and no backend URL other than relative `/api`
- [ ] `docs/security.md` (OWASP Top 10 as it applies)
- [ ] E2E: every response has the headers; zero CSP violations across the suite (`securitypolicyviolation` listener)
- [ ] Proof: CI blocks a pinned vulnerable package (then removed)

## Next action
Read `nginx/default.conf.template`, `index.html` (the inline theme script), and the e2e fixtures; write the CSP; run the container and the suite to find violations.

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
