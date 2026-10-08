# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-08
- **Phase:** 20 — Container Orchestration
- **Branch:** `feature/phase-20-kubernetes`
- **Step:** PR_OPEN
- **PR:** pending (see `gh pr list`)
- **Backend pinned at:** `phase-34-complete`. No stack runs now: start it from `../ecomdemo-backend-readonly` with `CUSTOMER_DB_PORT=15435 docker compose up --build --wait -d` (Windows app SignalRgb holds 5435) and stop it at the end with `docker compose --profile tools down` (no `-v`).
- **Waiting for user:** YES: review of the Phase 20 PR and a decision on web KI-025 (the cluster's backend is ahead of the pin with used-up data: 6 specs fail through the Ingress; ask the backend team for a cluster at the pin or reseed, or approve a spec fix). `approved, merge it` to merge. Carried: the screen-reader pass, `E2E_ADMIN_*`, relaying KI-019/020/021/022/024/025.

## Merge verification before this phase
Phase 19 (PR #24, merge `ad3504b`, tag `phase-19-complete`): all branch commits in `main`; `npm ci && npm run verify` exit 0 (827); `npm run e2e:docker` on `main` 985 passed + web KI-020; CI on `main` green and `publish` pushed `ghcr.io/mr-sujay-patil/ecomdemo-web` (digest `sha256:cec9f139…`, tags `latest` and the SHA; read from the job log). Backend sync: 49 commits past the pin, only KI-047 new; pin stays `phase-34-complete`.

## Checklist (from the phase file's "What you'll implement")
- [x] `k8s/` Kustomize: Deployment (2 replicas, non-root, read-only root, emptyDir), Service, ConfigMap, probes, resources
- [x] Ingress `shop.localhost` on the backend's Traefik; `localhost:18080` unchanged
- [x] Separate app in the backend's namespace; no backend object changed (fingerprint of 43 identical)
- [x] `scripts/k8s-up.sh` / `k8s-down.sh` (this app only)
- [x] `npm run e2e:k8s`: suite through the Ingress + pod deletion + rolling update (disruptive 3/3 pass; main suite 980/986: the 6 are the cluster's backend and data, web KI-025)
- [x] docs, test report, RECENT rotated; the shop is LEFT DEPLOYED in the cluster for review

## Next action
Wait for the owner's review. The shop is deployed in the backend's kind cluster (`bash scripts/k8s-down.sh` removes it); the backend compose stack is stopped. On `approved, merge it`: wait for CI to pass on the PR head and read it, `gh pr merge <n> --merge` (no `--delete-branch`); merge verification on `main` (`npm ci && npm run verify`; `npm run e2e:k8s` if the cluster is still up, reading the result and saying which failures are KI-025; start the compose stack with `CUSTOMER_DB_PORT=15435 docker compose up --build --wait -d` in `../ecomdemo-backend-readonly` and run `npm run e2e:docker` only if the cluster's data is still unusable); tag `phase-20-complete`; stop what I started. The first commit of the next branch updates the tracker row (20 ✅) and this file. Before the next phase: fetch the backend clone and compare with the pin. Next phase only on `continue`: Phase 21 (read its file first).

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
