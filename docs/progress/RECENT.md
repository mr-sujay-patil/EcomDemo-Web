# Recent Phase Summaries (rolling window: last 2 phases)

> Newest first. When a third summary is added, move the oldest to `docs/progress/archive/phase-XX-summary.md`. Maximum ~30 lines per summary: facts only, no narrative.

<!-- TEMPLATE
## Phase XX: <Title> (tag: phase-XX-complete, PR #N)
**What exists now:** <1–3 lines describing the app after this phase>
**Key code:** <features, components, hooks and modules that matter next>
**Config & infrastructure:** <scripts, env vars, ports, proxies, containers, and how to run>
**Tests:** <new unit/component/E2E tests and counts>
**Backend tested against:** <pinned tag>
**Gotchas:** <anything surprising the next phase must know>
**Owner TODOs open:** <TODO(owner) placeholders still waiting for the user>
**Backend asks:** <backend changes reported to the user, with web KI ids>
**Follow-ups (not done, out of scope):** <suggestions deferred to later phases>
-->

## Phase 05: Continuous Integration (tag: phase-05-complete, PR #5)
**What exists now:** Every PR and push to `main` runs GitHub Actions: `verify` (the full `npm run verify` + coverage thresholds) and `e2e` (the Playwright suite against the real backend stack at `BACKEND_TAG`, built on the runner). A failing unit or E2E test turns the PR red (proven with reverted probes). Dependabot watches npm and Actions weekly.
**Key code:** `.github/workflows/ci.yml` (jobs `verify` ~30 s, `e2e` ~4 min; e2e checks out this repo to `web/` and the backend to `ecomdemo-backend-readonly/` side by side, writes the backend `.env` from `.env.example` + a generated masked `JWT_SECRET`, `docker compose up --build --wait`, tees a footprint table to the job summary, uploads `playwright-report` + `backend-logs` on failure). `.github/dependabot.yml`.
**Config & infrastructure:** Actions pinned by SHA (checkout v7.0.1, setup-node v7.0.0, upload-artifact v7.0.1); `permissions: {}` at the top, `contents: read` per job. `BACKEND_TAG` = repo variable or `ki-001-fixed`. Runner: `ubuntu-latest`, 4 vCPU / 16 GB; the stack uses ~5 GB.
**Tests:** unchanged: 6 component, 22 E2E (CI: 22 passed, 2 retries on CI only).
**Backend tested against:** `ki-001-fixed` (locally and in CI)
**Gotchas:** Backend build dominates the e2e job (~3 min) because there are no per-service GHCR images (KI-015). CI does not block merging until the owner makes `verify` and `e2e` required checks in branch protection. Dependabot starts only after the merge to `main`. Only the head commit of a push gets a run.
**Owner TODOs open:** make `verify` and `e2e` required status checks on `main` (GitHub settings, admin only)
**Backend asks:** per-service images on GHCR tagged by release (web KI-015; backend: not tracked)
**Follow-ups (not done, out of scope):** switch e2e to `docker compose pull` when KI-015 is fixed; cache the backend's Maven/Docker layers if build time matters; publish this app's image (Phase 19); security scans (Phase 22).

## Phase 04: Code Quality (tag: phase-04-complete, PR #4)
**What exists now:** The app is unchanged (same bundle hash); `npm run verify` now also runs ESLint and a Prettier check, so style and a set of bug-prone patterns are enforced by machines.
**Key code:** `eslint.config.js` (flat, `defineConfig`: `recommendedTypeChecked` + `projectService`; hooks + jsx-a11y on `src/`; Playwright `flat/recommended` on `e2e/` with `expect-expect` counting `ready`; `no-console` off in tests/`e2e/`; `disableTypeChecked` for `**/*.js`; `eslint-config-prettier` last). `.prettierrc.json` (120 cols, no semicolons, single quotes), `.prettierignore` (`*.md`, `design-system/`, generated dirs), `.editorconfig`.
**Config & infrastructure:** **TypeScript 6.0.3** (was 7.0.2: 7 has no JS compiler API for typescript-eslint). **ESLint 9.39.5** (jsx-a11y 6.10.2 declares ≤9), typescript-eslint 8.71.0, react-hooks 7.1.1, jsx-a11y 6.10.2, playwright plugin 2.12.0, prettier 3.9.9, eslint-config-prettier 10.1.8, globals 17.12.0. Scripts `lint` (`--max-warnings=0`), `format`, `format:check`; `verify` = typecheck && lint && format:check && test && build. No pre-commit hook.
**Tests:** unchanged: 6 component, 22 E2E. Probes (deleted) proved each named rule fires and that an unformatted file fails `verify`.
**Backend tested against:** `ki-001-fixed`
**Gotchas:** A new file outside every tsconfig gets "was not found by the project service": add it to a tsconfig's `include` (or it's a `.js` config, which skips type-aware rules). A helper that wraps `expect` must be named `ready` or added to `expect-expect`'s `assertFunctionNames`. Run `npm run format` before committing. `design-system/` is ignored by both tools until Phase 9. The backend's product count changes when someone restarts it (14 this run).
**Owner TODOs open:** none
**Backend asks:** none
**Follow-ups (not done, out of scope):** back to TypeScript 7 when typescript-eslint supports it; ESLint 10 when jsx-a11y does; consider `strictTypeChecked`; run `verify` in CI (Phase 5); lint/format `design-system/` or not (Phase 9).

