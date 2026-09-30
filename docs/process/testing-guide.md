# 🧪 Testing Guide (unit and component tests)

How tests are written in this repo. The *when* and *what must pass* are in `testing-protocol.md`; this file is the *how*.

**Tools:** Vitest (runner, configured in `vite.config.ts`, jsdom environment) · Testing Library (`@testing-library/react`, `jest-dom` matchers, `user-event`) · MSW (the fake network).

## Where things are

| File | Purpose |
|---|---|
| `src/features/<feature>/*.test.tsx` | Tests sit next to the code they test |
| `src/test/setup.ts` | Loads the matchers; starts MSW; cleans up after each test |
| `src/test/render.tsx` | `renderWithProviders`: always render through this, never plain `render` |
| `src/test/msw/handlers.ts` | Default (happy path) handlers plus named variants per endpoint |
| `src/test/msw/server.ts` | The MSW server used by the setup |

## Rules

1. **Test behaviour, not implementation.** Assert what a user sees or can do. Don't reach into state, props, hooks or CSS classes; a refactor that keeps the behaviour must keep the tests green.
2. **Query priority:** `getByRole` (with `{ name }`) → `getByLabelText` → `getByText`. `getByTestId` only when nothing a user perceives identifies the element, with a comment saying why. If a role query can't find something, the markup is probably not accessible: fix the markup.
3. **`findBy…` for anything that appears after a request**, `queryBy…` only to assert something is absent.
4. **`userEvent` over `fireEvent`.** `const user = userEvent.setup()` before rendering, then `await user.click(…)` / `await user.type(…)`. It fires the full event sequence (focus, keydown, input, …) the way a browser does.
5. **One behaviour per test**, named as a sentence about that behaviour ("shows "Other" for a product without a category").
6. **No markup snapshots.** They break on harmless changes and pass on real regressions. Assert the specific text, role or state instead.
7. **Mock the network, not your own modules.** No `vi.mock` of `src/` code or `fetch`; override a response with `server.use(productHandlers.empty)` or an inline `http.get(…)` inside the test. Overrides reset after every test.
8. **Handlers are typed from the API:** `http.get<Params, RequestBody, ResponseBody>` with the API types, so a fixture that drifts from the contract fails the type check. (Phase 7 replaces the hand-written types with generated ones.)
9. **Unmocked requests fail the test** (`onUnhandledFrame: 'error'`). Add a handler; never loosen this.
10. **Never** `.skip`, `.only`, or delete a test to get green (CLAUDE.md rule 8).

## Commands

    npm test                  # all tests once (part of npm run verify)
    npx vitest                # watch mode while writing tests
    npx vitest run catalog    # only files whose path matches "catalog"
    npm run test:coverage     # with the V8 coverage report and thresholds

## Coverage

Thresholds in `vite.config.ts` are a **floor**: set to the measured values when coverage was added (Phase 2) and **raised, never lowered**, when a phase adds tests. `npm run test:coverage` fails below them. Coverage shows which lines ran, not whether they were checked: a high number with weak assertions is still a weak suite.

## What jsdom can't tell you

jsdom is a DOM in Node, not a browser: no layout, no real CSS, no scrolling or viewport. "Fits at 360 px", "visible", "focus ring shows" and "looks right in dark mode" are checked in the browser (Playwright, from Phase 3), not here.
