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

## Phase 02: Automated Testing (tag: phase-02-complete, PR #2)
**What exists now:** The app is unchanged; it now has unit/component tests (Vitest in jsdom, Testing Library, MSW faking the network) that run inside `npm run verify`.
**Key code:** `src/test/setup.ts` (jest-dom matchers, MSW server with `onUnhandledFrame: 'error'`, `cleanup()`), `src/test/render.tsx` (`renderWithProviders`, an empty wrapper: add the router/query client/session here), `src/test/msw/handlers.ts` (`handlers` = happy paths; `productHandlers.{success,empty,serverError}`; `productFixtures`, typed with `http.get<never, never, Body>`), `src/features/catalog/ProductListPage.test.tsx`.
**Config & infrastructure:** `test` block in `vite.config.ts` (jsdom, `src/**/*.test.{ts,tsx}`, V8 coverage of `src/` minus `src/test`, tests and `main.tsx`). Scripts: `test` (`vitest run`), `test:coverage`, `verify` = typecheck && test && build.
**Tests:** 6 component tests (loading → list, ₹ en-IN format, `null` → "Other", empty, 500 message + correlation id, network error + sent id). Coverage floor 91.11 / 74.19 / 91.66 / 97.5 (stmts/branches/funcs/lines).
**Backend tested against:** `ki-001-fixed` (the app re-run via dev + preview; the tests need no backend)
**Gotchas:** MSW 3 renamed `onUnhandledRequest` → `onUnhandledFrame`; the old key is silently ignored at runtime. No Vitest globals: import from `vitest`. Coverage thresholds are enforced only by `test:coverage`. The seeded catalogue now has 22 products (10 in Phase 1).
**Owner TODOs open:** none
**Backend asks:** none
**Follow-ups (not done, out of scope):** tests for the defensive branches (non-`ApiError` error body, abort, no `crypto.randomUUID`) would raise the branch floor; run `test:coverage` in CI (Phase 5); "Try again" button on the error state (carried from Phase 1).

## Phase 01: Baseline App (tag: phase-01-complete, PR #1)
**What exists now:** A Vite + React 19 + strict TypeScript app with one page that lists the whole catalogue from `GET /api/products` (name, ₹ price, category), with loading, empty and error states. No routing, tests, lint or styling.
**Key code:** `src/main.tsx` renders `ProductListPage` directly. `src/features/catalog/ProductListPage.tsx` (useEffect + AbortController; a `LoadState` union). `src/features/catalog/products.ts`: hand-written `ProductResponse` and `ApiError` (replaced in Phase 7), `fetchProducts()`, `ProductsRequestError { status, correlationId }`.
**Config & infrastructure:** Node 24.21.0 (`.nvmrc`, `engines ^24.21.0`, `.npmrc` engine-strict + save-exact). Scripts: `dev` (5173), `build`, `preview` (4173), `typecheck` (`tsc -b`), `verify` (typecheck && build). `vite.config.ts`: one `/api` proxy for server and preview, target `API_TARGET` via `loadEnv` (shell or `.env`), default `http://localhost:8080`; `strictPort`; alias `@` → `src`.
**Tests:** none yet (Phase 2). Checked by hand-scripted curl + headless Chrome: 10 products via dev and preview; error state with the backend down.
**Backend tested against:** `ki-001-fixed`
**Gotchas:** A non-interactive WSL shell finds the Windows npm first: `. ~/.nvm/nvm.sh && nvm use`. TypeScript is 7.0.2 (native; no JS compiler API): if a Phase 2–4 tool needs `typescript`'s JS API, fall back to 6.0.3 and log it. With the gateway down the Vite proxy returns 502 with an empty body (not an `ApiError`). The page sends its own `X-Correlation-Id` (UUID); the gateway keeps it. Seed data has no `null` category and is never empty.
**Owner TODOs open:** none
**Backend asks:** none
**Follow-ups (not done, out of scope):** a "Try again" button on the error state (the guide recommends one for backend down; E2E expects it later); tests for the "Other" category, empty and loading states (Phase 2); `docs/modules/catalog.md` (Phase 8, per `docs/modules/README.md`).
