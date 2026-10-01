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

## Phase 07: Typed API Client (tag: phase-07-complete, PR #N)
**What exists now:** Every backend call is typed from the backend's OpenAPI documents: a committed snapshot per service, generated types, one `openapi-fetch` client per service, one `ApiError`. The product list now loads through it.
**Key code:** `scripts/api.ts` + `scripts/openapi.ts` (`api:snapshot`, `api:generate`, `api:check`), `api/openapi/*.json`, `src/api/generated/*.ts` (never edited), `src/api/client.ts` (`catalogApi`, `customerApi`, `appApi`, `assistantApi`, `inventoryApi`, `createApiClient`, `setAccessTokenProvider` for Phase 11), `src/api/errors.ts` (`ApiError`), `retry.ts` (the only retry policy), `fieldErrors.ts` (`splitFieldErrors` for Phase 10), `access.ts` (`accessFor`, from the guide's tables). Architecture: `docs/architecture/api-layer.md`.
**Config & infrastructure:** `openapi-fetch` 0.17.0, `openapi-typescript` 7.13.0 (npm `overrides` for its TypeScript peer). `npm run e2e` starts with `api:check`. Coverage floor 98.02 / 89.77 / 100 / 99.21. Backend pin `phase-33-complete`.
**Tests:** 137 unit and component (was 38), 208 E2E (was 206).
**Backend tested against:** `phase-33-complete`
**Gotchas:** Failures reject with `ApiError` (status 0 = no response); aborts stay `AbortError`. Only GETs retry, once. The base URL is the page's origin because the documents' paths already include `/api`. Types are generated with response properties as required (web KI-016). A pin move = `api:snapshot`, `api:generate`, review, commit alone. The login `429` has `retryAfter`: the countdown is Phase 11 (`docs/backend/phase-33-delta.md`). The 429 retry waits at most 5 s; a longer `Retry-After` reaches the caller.
**Owner TODOs open:** `src/content/site.ts`; every paragraph of About, Returns, Shipping, Privacy, Terms
**Backend asks:** none (cosmetic: response properties marked required, KI-016; who may call `DELETE /api/inventory/{productId}`)
**Follow-ups (not done, out of scope):** caching and loading states (Phase 8); the login countdown and token provider (Phase 11); `@types/node` 26 against Node 24 (Dependabot PR #6, still not investigated).

## Phase 06: Routing (tag: phase-06-complete, PR #8)
**What exists now:** Every screen of the guide has a URL, a document title and a place in the layout (skip link, header, `<main>`, footer). Pages later phases build show their final `h1` and "built in Phase N". The product list is at `/`.
**Key code:** `src/app/router.tsx` (exported `routes`, `createAppRouter()`; `handle: { title }` per route; `lazy` for `/checkout` and `/admin/*`; `HydrateFallback`), `src/app/Layout.tsx` (title, focus the new `h1` after a pathname change, skip link, `<ScrollRestoration />`), `src/content/site.ts` (the owner's values), `src/features/content/*Page.tsx` (`TODO(owner)` paragraphs), `src/components/{Todo,PlaceholderPage}.tsx`, `renderRoute(path)` in `src/test/render.tsx`.
**Config & infrastructure:** `react-router` 8.4.0 (`RouterProvider` from `react-router/dom`). Backend pin moved to `phase-33-complete` (chore PR #7). Coverage floor raised to 94.04 / 75.6 / 96.96 / 98.68.
**Tests:** 38 unit and component (was 6), 206 E2E (was 22): every route by deep link and by navigation, 404, skip link, code splitting, the matrix over every route. 5 screens screenshotted.
**Backend tested against:** `phase-33-complete`
**Gotchas:** Pages must not render their own `<main>` (the layout owns it). A new route is added to `routes` in `router.tsx`, to `routePages` in `e2e/screens.ts` and to the table in `docs/architecture/routing.md`. The production image needs an SPA fallback (Phase 19). Dev-only warnings (like `HydrateFallback`) never show in the E2E run, which uses the production build: load `npm run dev` too. Login throttling (`429` + `Retry-After`) is for Phase 11: `docs/backend/phase-33-delta.md`.
**Owner TODOs open:** `src/content/site.ts`; every paragraph of About, Returns, Shipping, Privacy, Terms
**Backend asks:** none
**Follow-ups (not done, out of scope):** the assistant's lazy split (Phase 16); real styling (Phase 9); `@types/node` 26 against Node 24 (bumped by Dependabot PR #6; `verify` passes, not investigated).

