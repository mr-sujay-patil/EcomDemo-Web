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

## Phase 08: Server State (tag: phase-08-complete, PR #N)
**What exists now:** The catalogue is real: a shelf with a category filter, sort (name, price either way) and 24 to a page, all in the URL (`?category=&sort=&page=`), and a product page (`/products/:id`) with a stock hint, a disabled Add to cart and "No longer available" for a missing product. Server data lives in the TanStack Query cache.
**Key code:** `src/app/providers.tsx` (`createQueryClient`, `AppProviders`), `src/features/catalog/api.ts` (`catalogKeys`, `productsQuery`, `productQuery`, `useProducts`, `useProduct`, `usePrefetchProduct`), `shelf.ts` (the pure filter, sort, page and URL functions; `stockHint`), `ProductListPage.tsx`, `ProductPage.tsx`, `src/components/ErrorPanel.tsx` (message, correlation id on 5xx and network, Retry), `src/lib/money.ts` (`formatPrice`). Docs: `docs/architecture/state.md`, `docs/modules/catalog.md`.
**Config & infrastructure:** `@tanstack/react-query` 5.104.0. App-wide `retry: false` (Phase 7 retries); catalogue fresh 5 min, no refetch on focus. Coverage floor 99.13 / 92.68 / 100 / 100. Backend pin `phase-33-complete`.
**Tests:** 187 unit and component (was 137), 229 E2E (was 208).
**Backend tested against:** `phase-33-complete`
**Gotchas:** Tests render through `renderRoute(path)` (it gives each render its own query cache). A page uses `useSearchParams`, so it needs a router in tests. A new query key goes in `catalogKeys`-style factories, never inline. The live catalogue has under 24 products, so the pager is browser-tested with a stubbed list. The results areas use an inline `min-height` that Phase 9 replaces with a token class. Prices are only formatted, never computed. A 404 or stubbed 5xx response needs `allowedConsoleErrors` in E2E (the browser logs it).
**Owner TODOs open:** `src/content/site.ts`; every paragraph of About, Returns, Shipping, Privacy, Terms
**Backend asks:** none
**Follow-ups (not done, out of scope):** per-product tab titles; styling (Phase 9); Add to cart (Phase 12); search (Phase 15).

## Phase 07: Typed API Client (tag: phase-07-complete, PR #9)
**What exists now:** Every backend call is typed from the backend's OpenAPI documents: a committed snapshot per service, generated types, one `openapi-fetch` client per service, one `ApiError`. The product list now loads through it.
**Key code:** `scripts/api.ts` + `scripts/openapi.ts` (`api:snapshot`, `api:generate`, `api:check`), `api/openapi/*.json`, `src/api/generated/*.ts` (never edited), `src/api/client.ts` (`catalogApi`, `customerApi`, `appApi`, `assistantApi`, `inventoryApi`, `createApiClient`, `setAccessTokenProvider` for Phase 11), `src/api/errors.ts` (`ApiError`), `retry.ts` (the only retry policy), `fieldErrors.ts` (`splitFieldErrors` for Phase 10), `access.ts` (`accessFor`, from the guide's tables). Architecture: `docs/architecture/api-layer.md`.
**Config & infrastructure:** `openapi-fetch` 0.17.0, `openapi-typescript` 7.13.0 (npm `overrides` for its TypeScript peer). `npm run e2e` starts with `api:check`. Coverage floor 98.02 / 89.77 / 100 / 99.21. Backend pin `phase-33-complete`.
**Tests:** 137 unit and component (was 38), 208 E2E (was 206).
**Backend tested against:** `phase-33-complete`
**Gotchas:** Failures reject with `ApiError` (status 0 = no response); aborts stay `AbortError`. Only GETs retry, once. The base URL is the page's origin because the documents' paths already include `/api`. Types are generated with response properties as required (web KI-016). A pin move = `api:snapshot`, `api:generate`, review, commit alone. The login `429` has `retryAfter`: the countdown is Phase 11 (`docs/backend/phase-33-delta.md`). The 429 retry waits at most 5 s; a longer `Retry-After` reaches the caller.
**Owner TODOs open:** `src/content/site.ts`; every paragraph of About, Returns, Shipping, Privacy, Terms
**Backend asks:** none (cosmetic: response properties marked required, KI-016; who may call `DELETE /api/inventory/{productId}`)
**Follow-ups (not done, out of scope):** caching and loading states (Phase 8); the login countdown and token provider (Phase 11); `@types/node` 26 against Node 24 (Dependabot PR #6, still not investigated).

