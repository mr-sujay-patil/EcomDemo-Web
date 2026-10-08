# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-09
- **State:** all planned phases (0 to 23) are merged and tagged (`phase-23-complete`, PR #31). Working on: `chore/phase-23-housekeeping` (tracker row 23, `RECENT.md`, this file).
- **Branch:** `chore/phase-23-housekeeping`
- **Step:** PR_OPEN (when the PR exists; see `gh pr list`)
- **Backend pinned at:** commit `f088fd4f517cceda44e478c9ca3ba8d5de1f8c68`. Backend `origin/main` was `3c7ecf5` on 2026-10-09 (KI-052, KI-053: internal, nothing for the web). No stack runs now (start: `CUSTOMER_DB_PORT=15435 docker compose up --wait -d` in `../ecomdemo-backend-readonly`; stop: `docker compose --profile tools down`, no `-v`).
- **Waiting for user:** review and `approved, merge it` for this chore. The owner's plan after it, in order: tag `v1.0` (the Phase 23 file asks for it; owner approved the order "housekeeping, then v1.0, then KI-030 and KI-031 as one fix PR"), then the fix PR for web KI-030 (the shelf and admin list are not paged) and KI-031 (503 with `Retry-After`).

## Open items (nothing else is planned)
- Owner decisions: reconcile CLAUDE.md workflow rules 9/10/3/5 with the hard rules (until then follow the hard rules); turn on branch protection "Require branches to be up to date before merging" and "Do not allow bypassing" on `main` (CI skips `verify` and `e2e` on pushes to main).
- To relay to the backend team: KI-032 (message in PR #31), KI-019/020/021/022/024/025.
- Defects: web KI-020 (specs assume seed stock; the local volumes are drained), KI-025, KI-026/028/029 (flakes under load), KI-027 (LCP warning), KI-030, KI-031, KI-032. The Phase 18 screen-reader pass and `E2E_ADMIN_*` are carried.

## Next action
Wait for the owner. After the merge: confirm CI on the PR head was green, merge verification on `main`, no tag for a chore. Then, if the owner confirms, tag `v1.0` on the `main` commit, and start `fix/ki-030-031-…` (read `docs/KNOWN_ISSUES.md` rows KI-030 and KI-031 only).

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
