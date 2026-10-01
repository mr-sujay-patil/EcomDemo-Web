# Test Report: Phase 5 (Continuous Integration)

- **Date:** 2026-10-01
- **Branch:** `feature/phase-05-github-actions` (PR #5)
- **Run by:** Claude Code, on the owner's machine and on GitHub Actions
- **Machine (local):** Windows 11 Pro + WSL2 Ubuntu (kernel 6.18.33.2-microsoft-standard-WSL2); Playwright's Chromium (build 1243), headless, inside WSL
- **Runner (CI):** GitHub-hosted `ubuntu-latest` (public repo: 4 vCPU, 16 GB RAM, as measured below)
- **Node / npm:** v24.21.0 (from `.nvmrc`, locally via nvm and in CI via `actions/setup-node`) / 12.1.0
- **Backend:** tag `ki-001-fixed`. Locally: no stack was running, so this run **started it** from `../ecomdemo-backend-readonly` (`docker compose up --build --wait`, 46 s warm) and stopped it at the end (`docker compose --profile tools down`, no `-v`). In CI: built from source at `BACKEND_TAG` (see KI-015).

## 1. Full regression (local)

| Command | Result |
|---|---|
| `npm ci` | exit 0 |
| `npm run verify` | exit 0; "All matched files use Prettier code style!"; **1 file, 6 tests passed**, 0 skipped; `dist/assets/index-C9J7Gl8Y.js` 221.67 kB (69.43 kB gzip), the same hash as Phases 1–4: no app code changed |

No unit or component tests were added: this phase changes no app code (a tooling phase, like Phases 3 and 4). Its checks are the CI runs below.

## 2. End-to-end suite (local)

`npm run e2e`: exit 0, **22 passed** (2.9 s), 0 skipped, 0 flaky. Global setup: `Backend: http://localhost:8080 answers GET /api/products 200; tag ki-001-fixed (from ../ecomdemo-backend-readonly)`. The phase file lists no new E2E checks; the suite is unchanged.

## 3. CI runs

| Run | Head | `verify` | `e2e` | Notes |
|---|---|---|---|---|
| [36761255866](https://github.com/mr-sujay-patil/EcomDemo-Web/actions/runs/36761255866) | `0fd9cd8` | ✅ 31 s | ✅ 4 m 38 s | First full run; `coverage` artifact (24.6 kB) |
| [36762023177](https://github.com/mr-sujay-patil/EcomDemo-Web/actions/runs/36762023177) | `6631321` (unit probe) | ❌ | ✅ | Proves a failing unit test blocks the PR |
| [36763086075](https://github.com/mr-sujay-patil/EcomDemo-Web/actions/runs/36763086075) | `95a014e` (E2E probe) | ✅ | ❌ | Proves a failing E2E test blocks the PR |
| [36812323590](https://github.com/mr-sujay-patil/EcomDemo-Web/actions/runs/36812323590) | `9bb7c5d` (both probes reverted) | ✅ 30 s | ✅ 3 m 54 s | Final head before docs; 22 passed (8.5 s), `tag ki-001-fixed (from BACKEND_TAG)` |

The `e2e` job's steps on the final run: backend build and start 184 s, Chromium install 24 s, `npm ci` 5 s, suite 10 s. On success the report and backend-log uploads are skipped (they run only on failure).

## 4. Acceptance (Done when)

| Check | Result | How |
|---|---|---|
| A failing unit test blocks a PR | ✅ | Commit `6631321` added `src/ciProbe.test.ts` (`expect(1 + 1).toBe(3)`). Run 36762023177: `verify` **failed** at `vitest run`: `FAIL src/ciProbe.test.ts > CI probe > fails on purpose`; `e2e` green. Reverted by `61d9163` (`git revert`, no history rewrite) |
| A failing E2E test blocks a PR | ✅ | Commit `95a014e` added `e2e/ciProbe.spec.ts` (expects a heading that does not exist). Run 36763086075: `e2e` **failed**: `1 failed`, `22 passed`, the probe tried 3 times (retry #1, #2); artifacts `playwright-report` (924 kB, with traces) and `backend-logs` (153 kB) uploaded; `verify` green. Reverted by `aa0bb29` |
| Actions pinned by SHA, minimal permissions | ✅ | Every `uses:` is a 40-character SHA with its version in a comment; workflow `permissions: {}`, each job `contents: read`; actionlint and shellcheck clean |
| Dependabot | ✅ | `.github/dependabot.yml`: npm weekly (minor + patch grouped; TypeScript minor/major and ESLint + `@eslint/js` major ignored, the Phase 4 hold-backs) and GitHub Actions weekly. ⚠️ Its first PRs appear only after merge to `main` (Dependabot reads the default branch) |

## 5. Does the stack fit a hosted runner?

Yes. Measured after the stack was healthy (run 36812323590, `Record the stack's footprint`):

- 4 vCPUs; memory 15 989 MB total, **5 037 MB used**, 10 951 MB available; swap unused.
- The eight Spring services together use about 2.6 GB (each 230–430 MiB against its 768 MiB or 1 GiB cap); Kafka 348 MiB; the six Postgres databases about 50 MiB each; the observability stack (Grafana, Prometheus, Loki, Tempo, Alloy) about 280 MiB.

Headroom is about 2×, so the MSW fallback was not needed.

## 6. Manual steps and manual verification

- ⚠️ **Make the checks required.** CI turns a PR red, but GitHub still lets you merge a red PR until branch protection says otherwise. To block it: GitHub → the repo → Settings → Branches (or Rules → Rulesets) → add a rule for `main` → "Require status checks to pass" → add `verify` and `e2e`. This needs the repo admin (you); it was not changed by this phase.
- ⚠️ **Dependabot** opens its first PRs after the merge (see section 4). Check the Pull requests tab next week.
- Optional: set the repository variable `BACKEND_TAG` (Settings → Secrets and variables → Actions → Variables) when the backend pin moves; without it CI uses `ki-001-fixed`.

## 7. Clean-up

The local backend stack was started by this run and stopped with `docker compose --profile tools down` (no `-v`); no `ecomdemo-*` service containers remain (only the unrelated `ecomdemo-control-plane`). The probe files are gone (reverted commits). `git status` clean apart from the owner's untracked guide.
