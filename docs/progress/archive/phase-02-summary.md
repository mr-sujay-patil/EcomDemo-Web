# Phase 02 Summary (archived from RECENT.md)

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
