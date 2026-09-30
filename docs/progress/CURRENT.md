# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-01
- **Phase:** 5 — Continuous Integration
- **Branch:** `feature/phase-05-github-actions`
- **Step:** IMPLEMENTING
  (NOT_STARTED | PREFLIGHT | BRANCHED | PLANNING | IMPLEMENTING | TESTING | PR_OPEN | VERIFYING | WAITING_FOR_USER)
- **PR:** #5 (draft while CI is proven; mark ready at the stop)
- **Backend pinned at:** `ki-001-fixed` (read-only clone `../ecomdemo-backend-readonly`)
- **Waiting for user:** NO

## Merge verification before this phase
Phase 4 (PR #4, merge commit `194e7e7`): PASS on 2026-10-01. PR state MERGED; branch tip `aa8d23a` is an ancestor of `origin/main`; `git log main..branch` and `git diff --stat` empty; branch exists locally and on GitHub; deliverables present on `main`; `npm ci && npm run verify` green (6/6) and `npm run e2e` 22/22 against `ki-001-fixed`. Tag `phase-04-complete` pushed.

## Design (decided)
- **Requires gap, user chose option 1 (2026-10-01):** the backend publishes only one GHCR image (`ghcr.io/mr-sujay-patil/ecomdemo`, the default `MODULE=ecomdemo-app`, tagged `latest`/`sha-<main commit>`); none of the 8 per-service images the compose stack uses, and nothing for `ki-001-fixed` (`sha-9023940` absent). So the e2e job **builds the backend from source** at `BACKEND_TAG`; record the gap as a web KI row pointing at the backend (backend: not tracked). Swap to pulled images when they exist.
- Repo is PUBLIC → `ubuntu-latest` hosted runner has 4 vCPU / 16 GB. Backend JVM caps sum ≈ 6.4 GB (1G app + 7×768M) plus DBs, Kafka, observability: measure in CI and record in the test report.
- Actions pinned by SHA (latest stable, 2026-10-01): checkout v7.0.1 `3d3c42e5…`, setup-node v7.0.0 `82076278…`, upload-artifact v7.0.1 `043fb46d…`, cache v6.1.0 `55cc8345…`.
- Workflow `permissions: {}`; each job `contents: read`. `BACKEND_TAG` = `${{ vars.BACKEND_TAG || 'ki-001-fixed' }}`. Backend `.env` = its `.env.example` with a generated, masked `JWT_SECRET`.
- The CI run on a PR needs the PR to exist: raise it as a **draft** once local checks pass, iterate CI there, do the Done-when throwaway commits (then `git revert`, no history rewrite), then mark it ready and stop.

## Checklist (from the phase file's "What you'll implement")
- [x] `.github/workflows/ci.yml` on every PR and push to `main`
- [x] **verify** job: Node from `.nvmrc` + npm cache, `npm ci`, `npm run verify`, coverage uploaded as an artifact (run 36761255866: green, 31 s, `coverage` artifact 24.6 kB)
- [x] **e2e** job: backend checked out at `BACKEND_TAG` (default `ki-001-fixed`), compose stack up (GHCR where available; built from source today), generated `JWT_SECRET`, wait for health, `npm run e2e`; Playwright report + traces uploaded on failure; stack fit measured (run 36761255866: green, 4 m 38 s total, backend build+start 3 m 30 s, 22 passed; footprint now also `tee`d to the log)
- [x] Dependabot: npm (minor + patch grouped, weekly) and GitHub Actions; ignores TS minor/major and ESLint major (Phase 4 hold-backs)
- [x] Actions pinned by commit SHA; minimal `permissions:` per job (actionlint + shellcheck clean)
- [x] Web KI row for the missing per-service GHCR images → **KI-015**
- [ ] Done when: a failing unit test and a failing E2E test each turn the PR red (throwaway commits, reverted)
- [ ] Testing protocol → `docs/test-reports/phase-05.md` (CI run links); docs (README, `decisions.md`, `RECENT.md` rotated, tracker 🔵) → PR ready

## Next action
Done-when probes on PR #5: (1) `test: throwaway failing unit test` (`src/ciProbe.test.ts`) → expect `verify` red → `git revert` it; (2) a failing `e2e/ciProbe.spec.ts` → expect `e2e` red with the `playwright-report` artifact → `git revert`. Record run links, then write `docs/test-reports/phase-05.md`, add the Phase 05 summary to `RECENT.md` (Phase 03 already archived), tracker 🔵, fill the PR body from the template, `gh pr ready 5`, STOP. README and `decisions.md` are done.

## ⚠️ Environment notes (this machine)
- One backend stack at a time: if `ecomdemo-gateway-service` is running, use it.
- The repo folder is `~/projects/ecomdemo-web` (lowercase), not `~/projects/EcomDemo-Web` as the docs say; relative paths still work.
- Node v24.21.0 via nvm in WSL, loaded only by interactive shells (`~/.bashrc`). Non-interactive commands must `. ~/.nvm/nvm.sh` first, or `npm` resolves to the Windows install under `/mnt/c`.
- Root `ecomdemo-frontend-integration-guide.md` is an untracked duplicate of `docs/backend/integration-guide.md` (owner's choice); leave it.
- Claude Code runs on Windows: run git/gh/npm in WSL. `wsl.exe -- bash -lc "…"` expands `$vars` in the outer shell first, so put multi-step commands in a script file and run `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash /mnt/c/…/script.sh` (Git Bash on the UNC path hits "dubious ownership"; `gh` is only in WSL). Redirect the script's output to a file in WSL and `cat` it, or lines get mangled. The Chrome extension blocks localhost: use headless Chrome (`--dump-dom`, `--enable-logging=stderr`).
- `~/.cache/ms-playwright` already holds `chromium-1243` and `chromium_headless_shell-1243`.

## ⚠️ Carried, not fixed (oldest first)
-
