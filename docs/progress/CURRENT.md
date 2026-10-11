# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-11
- **Task:** Phase 25: Code Quality Dashboard (SonarQube) (web KI-014, approved by the user on 2026-10-11: self-hosted SonarQube Community mirroring the backend's Phase 12; no SonarQube Cloud, no CI gate, no secret), `docs/phases/phase-25-sonarqube.md`
- **Branch:** `feature/phase-25-sonarqube` (cut from `main` at `70d64f6`, the merge of PR #44; Phase 24 verified: CI on `main` green, tag `phase-24-complete` to push by the owner, tag pushes are refused here with 403)
- **Step:** IMPLEMENTING
- **Backend pinned at:** commit `669a9ed1dfcc8ef0d89608c87ef05421bb157fb6` (unchanged; this phase needs nothing from the backend)
- **Waiting for user:** no

## Checklist
- [x] Phase file, tracker (Phase 24 ✅, Phase 25 row), KI-014 moved to "Covered by an approved phase"
- [x] `compose.sonar.yaml` (project `ecomdemo-web-sonar`, 127.0.0.1:9010, own names and volumes, pinned tags)
- [x] `scripts/sonar-setup.sh` (wait, admin password from env, project, gate on new code, attach, token printed once)
- [x] `sonar-project.properties`, `npm run sonar` (scanner Docker image), lcov reporter in `vite.config.ts`
- [x] `scripts/sonar.test.ts` (config checks, no stack)
- [ ] Real run: stack up, setup twice, `npm run test:coverage && npm run sonar`, gate and metrics from the web API, stack down
- [ ] Decisions `[Phase 25]`, README, development-environment ports, test report, `RECENT.md` (Phase 23 archived), tracker 🔵
- [ ] Full `npm ci && npm run verify`; PR opened

## Next action
Write `compose.sonar.yaml` (mirror the backend's: SonarQube `26.9.0.129388-community` + `postgres:18.6-alpine3.24`, names `ecomdemo-web-sonarqube` / `ecomdemo-web-sonar-db`, port `127.0.0.1:9010`), then `scripts/sonar-setup.sh` and `sonar-project.properties`.

## ⚠️ Environment notes (this machine)
- The backend team's own stack (`~/projects/ecomdemo`, compose project `ecomdemo`) was running on 2026-10-06 and reported `phase-34-complete-2-g40fed61` (two commits past the tag). Its API matched the tag (snapshots differ only by `imageUrl` and the image path). Never stop or touch it; starting the clone's stack fails on the container names while it runs.
- One backend stack at a time: if `ecomdemo-gateway-service` is running, use it.
- The repo folder is `~/projects/ecomdemo-web` (lowercase), not `~/projects/EcomDemo-Web` as the docs say; relative paths still work.
- Node v24.21.0 via nvm in WSL, loaded only by interactive shells (`~/.bashrc`). Non-interactive commands must `. ~/.nvm/nvm.sh` first, or `npm` resolves to the Windows install under `/mnt/c`.
- Root `ecomdemo-frontend-integration-guide.md` is an untracked duplicate of `docs/backend/integration-guide.md` (owner's choice); leave it.
- Claude Code runs on Windows: run git/gh/npm in WSL. `wsl.exe -- bash -lc "…"` expands `$vars` in the outer shell first, so put multi-step commands in a script file and run `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash /mnt/c/…/script.sh` (Git Bash on the UNC path hits "dubious ownership"; `gh` is only in WSL). Redirect the script's output to a file in WSL and `cat` it, or lines get mangled. The Chrome extension blocks localhost: use headless Chrome (`--dump-dom`, `--enable-logging=stderr`).
- `~/.cache/ms-playwright` already holds `chromium-1243` and `chromium_headless_shell-1243`.

## ⚠️ Carried, not fixed (oldest first)
- The backend stack running here (`ecomdemo-gateway-service`) is ahead of the pin: `npm run e2e` stops at `api:check` (dead-letter admin schema `dltTimestamp`). Run `npx playwright test --project=chromium` and say so, or have the owner approve a `chore/pin-backend-<tag>`.
- Tag `ki-020-fixed` is not pushed (tag pushes are refused here with 403): the owner runs `git tag ki-020-fixed 1f584e6 && git push origin ki-020-fixed`.
