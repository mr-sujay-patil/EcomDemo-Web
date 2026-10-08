# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-09
- **Task:** fix KI-033 (the performance budget is borderline since Phase 23's tracing): the owner chose option 1, start tracing after the first paint
- **Branch:** `fix/ki-033-tracing-after-first-paint`
- **Step:** PR_OPEN (PR #39; see `gh pr list`)
- **Backend pinned at:** commit `82ef5989594c30330850594f388967b8f080ce8a`. The stack is STOPPED (`scripts/backend-stack.sh up` to start it, never `down -v`).
- **Waiting for user:** review and `approved, merge it` for PR #39. Then (strict rule 9): local `verify` on `main`, the CI run on `main` green, tag `ki-033-fixed`, start nothing before. **Watch the next several PRs' `perf` step**: one green run does not prove KI-033 fixed (it failed about 1 PR in 4); if it fails again, the next option is lowering the minimum to 0.89 (the owner's call).
- Open, not started: KI-034 (k8s HTTPS, blocked on the backend: `shop.localhost` in the certificate), KI-032 (gateway request log, for the owner to relay), KI-026/028 (flakes), KI-020/025; owner: the two branch-protection settings on `main`.

## Result
Local `perf` after the change: shelf 96 (TBT 0 ms, was 12 to 44), product page 93 (TBT 3 ms, was 6 to 16); shelf JavaScript on the wire 131.6 KB (was 147.3; the Lighthouse total counts the idle-loaded tracing chunk too: 153.0 KB, under 170). The signed-in flows could not run locally (stock 0). E2E: the observability and catalog specs pass; the real-outage spec passes (Retry carries the `traceparent`; Tempo has that trace).

## Next action
Wait for CI on PR #39 and the owner's `approved, merge it`.

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
