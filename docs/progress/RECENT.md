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

## Phase 06: Routing (tag: phase-06-complete, PR #N)
**What exists now:** Every screen of the guide has a URL, a document title and a place in the layout (skip link, header, `<main>`, footer). Pages later phases build show their final `h1` and "built in Phase N". The product list is at `/`.
**Key code:** `src/app/router.tsx` (exported `routes`, `createAppRouter()`; `handle: { title }` per route; `lazy` for `/checkout` and `/admin/*`; `HydrateFallback`), `src/app/Layout.tsx` (title, focus the new `h1` after a pathname change, skip link, `<ScrollRestoration />`), `src/content/site.ts` (the owner's values), `src/features/content/*Page.tsx` (`TODO(owner)` paragraphs), `src/components/{Todo,PlaceholderPage}.tsx`, `renderRoute(path)` in `src/test/render.tsx`.
**Config & infrastructure:** `react-router` 8.4.0 (`RouterProvider` from `react-router/dom`). Backend pin moved to `phase-33-complete` (chore PR #7). Coverage floor raised to 94.04 / 75.6 / 96.96 / 98.68.
**Tests:** 38 unit and component (was 6), 206 E2E (was 22): every route by deep link and by navigation, 404, skip link, code splitting, the matrix over every route. 5 screens screenshotted.
**Backend tested against:** `phase-33-complete`
**Gotchas:** Pages must not render their own `<main>` (the layout owns it). A new route is added to `routes` in `router.tsx`, to `routePages` in `e2e/screens.ts` and to the table in `docs/architecture/routing.md`. The production image needs an SPA fallback (Phase 19). Dev-only warnings (like `HydrateFallback`) never show in the E2E run, which uses the production build: load `npm run dev` too. Login throttling (`429` + `Retry-After`) is for Phase 11: `docs/backend/phase-33-delta.md`.
**Owner TODOs open:** `src/content/site.ts`; every paragraph of About, Returns, Shipping, Privacy, Terms
**Backend asks:** none
**Follow-ups (not done, out of scope):** the assistant's lazy split (Phase 16); real styling (Phase 9); `@types/node` 26 against Node 24 (bumped by Dependabot PR #6; `verify` passes, not investigated).

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

