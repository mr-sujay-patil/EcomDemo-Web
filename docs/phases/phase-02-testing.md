# Phase 2: Automated Testing

| | |
|---|---|
| **Stage** | Stage 1: Foundation |
| **Technology** | Vitest + Testing Library + MSW |
| **Branch** | `feature/phase-02-testing` |
| **PR title** | `Phase 02: Automated Testing` |
| **Requires** | `phase-01-complete` on `main` |
| **Needs from the backend** | none (the API is mocked) |
| **Completion tag** | `phase-02-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** Every later phase can prove its code works the way a user uses it, with the network faked at the network boundary.

**What you'll implement**
- Vitest through `vite.config.ts` (jsdom environment), `src/test/setup.ts` with `@testing-library/jest-dom` matchers, and `@testing-library/user-event`.
- MSW (Mock Service Worker): `src/test/msw/handlers.ts` for `GET /api/products` (success, empty, 500 with `{status, message}` and an `X-Correlation-Id` header), and a server started in the test setup with `onUnhandledRequest: 'error'`.
- `src/test/render.tsx`: a `renderWithProviders` helper (empty now; later phases add the router, query client and session).
- Tests for the product list: loading → list; empty state; error state shows `message`; a network error shows the correlation id; `null` category shows "Other"; prices formatted in ₹.
- Coverage with the V8 provider: `npm run test:coverage`; thresholds set to the measured values and **raised, never lowered**, by later phases.
- `docs/process/testing-guide.md` (short): query priority (`getByRole` → `getByLabelText` → `getByText`; `getByTestId` only with a reason), `userEvent` over `fireEvent`, one behaviour per test, no markup snapshots, MSW handlers typed from the API (Phase 7 makes that automatic).
- `verify` gains `test` (`vitest run`) before `build`. **From this phase on, every phase adds tests.**

**Concepts to understand**
- Testing behaviour, not implementation
- jsdom: what it simulates and what it cannot (layout, real CSS)
- Mocking at the network (MSW) versus mocking your own functions
- Coverage as a floor

**Done when**
- `npm run verify` runs the tests; a deliberately broken assertion fails it (shown, then reverted).

**Not in this phase:** browser tests against the real backend (Phase 3).

## E2E additions (`e2e/`)

None yet.

## Your manual steps (user)

None. Only review, learn, merge, and reply `merged, continue`.
