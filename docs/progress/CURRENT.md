# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-09
- **Task:** fix KI-030 (the product list is paged) and KI-031 (503 with `Retry-After`) in one `fix/` branch (the owner's rule 10 in CLAUDE.md allows grouping; each KI still gets its tag `ki-030-fixed`, `ki-031-fixed` after the merge)
- **Branch:** `fix/ki-030-031-paging-and-retry-after`
- **Step:** PR_OPEN (PR #34; see `gh pr list`)
- **Backend pinned at:** commit `f088fd4f517cceda44e478c9ca3ba8d5de1f8c68`. The stack runs from `bash scripts/backend-stack.sh up` (containers `webstack-*`, gateway on `localhost:28080`; `eval "$(bash scripts/backend-stack.sh env)"` sets `API_TARGET` and `GATEWAY_CONTAINER`); stop it with `bash scripts/backend-stack.sh down` (never `-v`). It is STOPPED now.
- **Waiting for user:** no (until the PR is raised). Carried: owner decisions on CLAUDE.md rule conflicts and branch protection; KI-032 message to relay; KI-033 (performance budget borderline).

## Checklist
- [x] KI-030: `fetchProducts` reads every page (tests: products.test.ts, ProductListPage.test.tsx, e2e catalog.spec.ts)
- [x] KI-031: `retryHint` in `ErrorPanel`; checkout 503 = "The shop is busy right now" + cart re-read (tests: errors.test.ts, checkout.test.tsx, ProductListPage.test.tsx, e2e observability.spec.ts)
- [x] Regression proof: 14 of the new tests fail on the old source (stash of the 5 source files), pass with the fix
- [x] e2e stubs of the product list use `productListUrl` (4 stubs had silently stopped intercepting)
- [x] `npm run verify` 889 passed (a first run failed on the KI-029 flake, the rerun is clean); `e2e:docker` 990 passed, 3 failed (stock 0, KI-020), 0 CSP violations; `perf`: Lighthouse 95/94, flows could not run locally (stock 0)
- [ ] CI green on PR #34 before asking the owner; tags `ki-030-fixed` and `ki-031-fixed` after the merge; stack is STOPPED

## Next action
Wait for CI on PR #34. After the merge: verify `main`, tag `ki-030-fixed` and `ki-031-fixed`, stop the stack.

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
