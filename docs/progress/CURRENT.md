# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-09
- **Task:** fix KI-029 (the flaky first admin test: `saga.test.tsx`, also `products.test.tsx`), the owner said `fix KI-029`
- **Branch:** `fix/ki-029-saga-test-flake`
- **Step:** PR_OPEN (PR #38; see `gh pr list`)
- **Backend pinned at:** commit `82ef5989594c30330850594f388967b8f080ce8a`. No stack runs now (this fix is unit tests only; `scripts/backend-stack.sh up` when needed, never `down -v`).
- **Waiting for user:** review and `approved, merge it` for PR #38. Then (rule 9, strict): local `verify` on `main` and the CI run on `main` green, then tag `ki-029-fixed`, and start nothing before that.
- Open, not started: KI-034 (k8s HTTPS, blocked on the backend's answer about `shop.localhost` in the certificate), KI-033 (perf budget borderline, the owner decides), KI-032 (gateway request log, relay), KI-026/028 (flakes), KI-020/025; owner: branch protection settings on `main`.

## Result
Reproduced by saturating the CPUs (2 busy loops per core): before, the saga test failed in 3 of 6 runs. Preload alone: 1 of 12. Preload and `asyncUtilTimeout: 4000`: 0 of 15 (all `src/features/admin` files). No unit test can reproduce a timing flake deterministically, so the regression evidence is that load test, in the PR.

## Next action
Wait for CI on PR #38 and the owner's `approved, merge it`.

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
