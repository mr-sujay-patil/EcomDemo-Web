# Phase 5: Continuous Integration

| | |
|---|---|
| **Stage** | Stage 1: Foundation |
| **Technology** | GitHub Actions |
| **Branch** | `feature/phase-05-github-actions` |
| **PR title** | `Phase 05: Continuous Integration` |
| **Requires** | `phase-04-complete` on `main`; backend images published to GHCR (backend Phase 11) |
| **Needs from the backend** | backend images for the E2E job (GHCR) |
| **Completion tag** | `phase-05-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** Every change is checked automatically, including against the real backend, and from now on nothing is merged red.

**What you'll implement**
- `.github/workflows/ci.yml` on every PR and push to `main`:
  - **verify** job: Node from `.nvmrc` with the npm cache, `npm ci`, `npm run verify`, coverage uploaded as an artifact.
  - **e2e** job: checks out `mr-sujay-patil/ecomdemo` at the pinned tag (read only; a `BACKEND_TAG` variable defaulting to `ki-001-fixed`), starts its compose stack using the backend's images from GHCR where available (a generated `JWT_SECRET` for the run; no secrets from this repo), waits for health, then runs `npm run e2e`. The Playwright HTML report and traces are uploaded on failure. If the stack cannot fit a hosted runner, record the measurement in the test report, keep the job with MSW-backed preview, and mark the real-backend run as a local step (⚠️) until solved.
- Dependabot for npm (grouped minor and patch, weekly) and GitHub Actions.
- Actions pinned by commit SHA; minimal `permissions:` per job.
- **From this phase on, a PR may be merged only when CI is green.**

**Concepts to understand**
- CI versus CD; jobs, steps, runners, caching
- Testing against a dependency owned by another repository, at a pinned version
- Least-privilege `GITHUB_TOKEN` and pinned actions

**Done when**
- A failing unit test and a failing E2E test each block a PR (shown with throwaway commits, then reverted).

**Not in this phase:** publishing this app's image (Phase 19), security scans (Phase 22).

## E2E additions (`e2e/`)

The CI e2e job runs the same `npm run e2e`. Record the CI run links in the test report.

## Your manual steps (user)

After the PR merges, add "Require status checks to pass" (the `verify` and `e2e` jobs) to `main`'s branch protection. From now on, merge only when CI is green.
