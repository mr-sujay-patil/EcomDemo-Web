# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-08
- **Phase:** 21 — Performance
- **Branch:** `feature/phase-21-performance`
- **Step:** PR_OPEN
- **PR:** pending (see `gh pr list`)
- **Backend pinned at:** `phase-34-complete`. No stack runs now: start it from `../ecomdemo-backend-readonly` with `CUSTOMER_DB_PORT=15435 docker compose up --build --wait -d` (Windows app SignalRgb holds 5435) and stop it at the end with `docker compose --profile tools down` (no `-v`).
- **Waiting for user:** YES: review of the Phase 21 PR; decide how LCP is enforced (web KI-027: calibrate the CPU slowdown for CI, or change the number; the product page's data fetch); web KI-025, KI-026, KI-028. `approved, merge it` to merge. Carried: the screen-reader pass, `E2E_ADMIN_*`, relaying KI-019/020/021/022/024/025.

## Merge verification before this phase
Phase 20 (PR #25, merge `842839e`, tag `phase-20-complete`): all branch commits in `main`; `npm ci && npm run verify` exit 0 (827); CI on `main` green incl. publish; `npm run e2e:k8s` on `main` 978 + 3 passed, 8 failed (6 = web KI-025, 2 = web KI-026, only when a pod is deleted). Backend sync: 52 commits past the pin, nothing for the web; pin stays `phase-34-complete`.

## Checklist (from the phase file's "What you'll implement")
- [x] Lighthouse CI against the production image: shelf, product page (cold) and cart, order (signed-in flow), mobile, throttled, 3 runs, median
- [x] Budgets that fail CI: performance, LCP, CLS, JS 170 KB, chunk 100 KB, fonts 120 KB (LCP is a WARNING on both pages: shelf 2.89 s on the CI runner vs 2.40 s here, product page 2.57 s, web KI-027)
- [x] Bundle analysis as a CI artifact (dev dependency only)
- [x] Real improvements with numbers (shelf 87 to 96, CLS 0.177 to 0.001, JS 192 to 128 KB)
- [x] `docs/performance.md`; heavy import proof (172.3 KB, exit 1, reverted)
- [x] Read CI: first run failed on the shelf LCP (2.89 s); LCP made a warning; the rest passes in CI; re-read the new run

## Next action
Wait for the owner's review. The backend compose stack is STOPPED; the shop is still deployed in the backend team's kind cluster from Phase 20 (`bash scripts/k8s-down.sh` removes it). On `approved, merge it`: wait for CI to pass on the PR head and read it (including the `performance` artifact and what the perf step said), `gh pr merge <n> --merge` (no `--delete-branch`); merge verification on `main` (`npm ci && npm run verify`; start the stack with `CUSTOMER_DB_PORT=15435 docker compose up --build --wait -d` in `../ecomdemo-backend-readonly`, run `npm run e2e:docker` and `npm run perf`, read both before tagging; web KI-020 fails on stock data); tag `phase-21-complete`; stop the stack. The first commit of the next branch updates the tracker row (21 done) and this file. Before the next phase: fetch the backend clone and compare with the pin. Next phase only on `continue`: Phase 22 (read its file first).

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
