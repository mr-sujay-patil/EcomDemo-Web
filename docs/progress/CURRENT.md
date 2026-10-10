# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-10
- **Task:** fix KI-034 (the k8s scripts, spec and Ingress still use plain HTTP on 18080) and KI-035 (the shop's nginx speaks HTTP to the now-HTTPS gateway in the cluster): same cause, backend KI-051/056
- **Branch:** `fix/ki-034-035-k8s-https` (cut from `main` at `d57bc4b`)
- **Step:** PR_OPEN (PR #40)
- **Backend pinned at:** commit `669a9ed1dfcc8ef0d89608c87ef05421bb157fb6` on this branch (was `82ef598`) (backend PR #86, KI-060: `shop.localhost` in the edge certificate). Between the two the backend's `src/main` changed only one comment, and compose did not change.
- **Waiting for user:** YES: CI on PR #40, the owner's local `npm run e2e:k8s`, then `approved, merge it`. The k8s E2E (`npm run e2e:k8s`) is run by the owner locally: the cloud session cannot build the kind cluster (its network policy blocks the Helm chart hosts and quay.io).

## Checklist
- [x] Regression tests: KI-034 (the Ingress has `tls` for `shop.localhost` with `ecomdemo-tls`; the scripts use https 18443) and KI-035 (the ConfigMap's upstream is https and nginx verifies it; a container test: verified HTTPS upstream 200, wrong CA 502, plain HTTP upstream still 200)
- [x] KI-035: `nginx/default.conf.template` `proxy_ssl_verify on` with `API_CA_FILE` (default: the image's CA bundle); ConfigMap `https://`, CA mounted from `ecomdemo-ca-public`
- [x] KI-034: `k8s/ingress.yaml` tls; `scripts/k8s-up.sh`, `scripts/e2e-k8s.sh` to https 18443 with the backend clone's CA (`NODE_EXTRA_CA_CERTS`, Chromium's SPKI pin); `e2e/k8s.spec.ts`
- [x] Pin: `chore(backend): pin 669a9ed` with its decisions line
- [x] Docs: development-environment, README, decisions, KNOWN_ISSUES (fixed)
- [x] `npm ci && npm run verify` (904 tests); PR #40
- [ ] CI green on PR #40

## Next action
Wait for CI on PR #40 (its `e2e` job builds the backend at the new pin from source: slow) and fix it if red. Then STOP for the owner: local `npm run e2e:k8s` and `approved, merge it`. After the merge (rule 9): local `npm ci && npm run verify` on `main`, the CI run on `main` green, tags `ki-034-fixed` and `ki-035-fixed` (this session's tag pushes are refused with 403: give the owner the commands). Watch `perf` (KI-033) on this PR as on the next few.

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
