# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-08
- **Task:** chore: move the backend pin to `f088fd4` (owner: "pin main's current commit")
- **Branch:** `chore/pin-backend-f088fd4`
- **Step:** PR_OPEN (when the PR exists; see `gh pr list`)
- **Backend pinned at:** commit `f088fd4f517cceda44e478c9ca3ba8d5de1f8c68` (was `phase-34-complete`). The compose stack from `../ecomdemo-backend-readonly` is RUNNING at that commit (`CUSTOMER_DB_PORT=15435 docker compose up --build --wait -d`); stop it with `docker compose --profile tools down` (no `-v`).
- **Waiting for user:** review and `approved, merge it` for the pin PR. Then, in the owner's order: **Part 2** (CI wall-clock: backend image cache + `backend-images.yml`, no repeat checks on push to main, unit tests once, Playwright cache, report perf layer cache; do not touch audit/image/Trivy; step timings of the latest e2e run go in the PR description; owner must turn on branch protection themselves), then **Part 1** (CLAUDE.md workflow rules: show the conflicts first, they were listed and the owner has not answered the 4 questions about rules 9, 10, 3 and PR sequencing).
- Phase 22 is DONE (tag `phase-22-complete`, PR #27); its summary is not yet in `RECENT.md` (add it in the next phase's first commit). Carried: the screen-reader pass, `E2E_ADMIN_*`, relaying KI-019/020/021/022/024/025, web KI-027, KI-028, KI-029, KI-030 (paging), KI-031 (503 Retry-After).

## Results at the new pin
`api:check` failed on 3 schemas, regenerated (`api:snapshot`, `api:generate`): catalogue paging + 400, `dltTimestamp`, inventory reserve/release removed (2 entries dropped from `notForTheFrontend`). `npm run verify` 853 passed. `npm run e2e` 1002 passed, 3 failed (`checkout` x2, `keyboard-flows`): stock of Desk Mat and Laptop Sleeve is 0 on this machine (web KI-020).

## Next action
Wait for the owner. After the merge: verify `main` (CI), no tag for a chore, then start Part 2 on `chore/ci-speed` only when told.

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
