# 🧪 Testing & Acceptance Protocol

Applies to every phase and every fix. A fix runs steps 1, 3, 4, 8 and 9 in full, adds the **regression test** that reproduced the defect (it must fail without the fix), and reports results in its PR description instead of a `docs/test-reports/` file.

A phase is **not done** until all of this passes on the feature branch before the PR is raised, and the regression and E2E suite pass again on `main` after the merge.

1. **Full regression.** `npm ci && npm run verify` runs, in order: type check (`tsc --noEmit`), lint and format check (from Phase 4), **all** unit and component tests from every phase so far (from Phase 2), the token check (from Phase 9), and the production build. Zero failures, zero lint errors, no test skipped (`.skip`, `.todo`) without a documented reason. **From Phase 2 every phase adds unit or component tests.**
2. **Phase acceptance tests.** Every **Done when** item has an automated test or scripted check proving it.
3. **Run the complete application** the way it runs at this phase: `npm run dev` and `npm run preview` (the production build) early on, the Docker image from Phase 19, and the kind cluster from Phase 20. The browser console must show **no errors and no React warnings** on every page the phase touches.
4. **The backend, pinned.** Phases that call the API run against the real backend at the tag in `development-environment.md`: if `docker ps` already shows `ecomdemo-gateway-service`, use that stack (and record its tag); otherwise start it from `../ecomdemo-backend-readonly`. Mocked APIs (MSW) are for unit and component tests only, never a substitute for this step. The test report records the backend tag.
5. **End-to-end suite.** `npm run e2e` (Playwright, from Phase 3) runs against the built app and the real backend:
   - browse the shelf → filter → open a product → (from Phase 11) sign in → (from Phase 12) add to cart → change quantity → (from Phase 13) place an order → watch it reach CONFIRMED → (from Phase 14) see it in My orders
   - negative cases grow with the features: unknown product (404 page), invalid form input (field errors), expired session (back to sign-in with the page state kept), a customer on an admin page (403 "not permitted", never a login loop), insufficient stock at checkout (409 next to the line, cart kept), payment declined (CANCELLED with the reason), backend down (a readable error with the correlation id and a retry button)
   - the new checks listed under "E2E additions" in the current phase file

   **Every phase extends this suite; checks are never removed.** It exits non-zero on any failure.
6. **Every width, both themes.** Every screen the phase touches is checked at **360, 480, 768, 1024 and 1280 px** in light and dark: no clipped text, no sideways scroll, no overlapping controls, actions aligned across a row. Automated from Phase 3 (a Playwright viewport matrix with an overflow assertion); screenshots at 360 and 1280 go into `docs/test-reports/phase-XX/`.
7. **Failure-scenario checks** where the phase is about resilience: a backend service stopped, a slow network (Playwright throttling), a 401 mid-session, a 429 from the gateway, a `503` from search or the assistant.
8. **Test report.** Commit `docs/test-reports/phase-XX.md` on the feature branch: the machine, Node and npm versions, the backend tag, the commands run, results (counts per type), key output excerpts, the screenshots, and any item needing manual verification, with steps for the user. Summarize it in the PR.
9. **Clean up.** Stop dev and preview servers and any containers this repo started. Leave the backend stack as you found it (say so in the report if you started it; stop it without `-v`).
10. **Honesty rule.** Never report a check as passed without running it. If something cannot be verified automatically (for example, whether a screen *feels* hand-made), mark it ⚠️ and give manual steps.

## Context-friendly testing

- Never paste full test, lint or build output into the conversation. Use the summary lines (Vitest's `Tests … passed`, Playwright's final line), `tail`, or `grep`.
- On failure, read only the failing test and the relevant part of its output; for Playwright, open the trace of the one failing test.
- Record results in the test report and `docs/progress/CURRENT.md`, not only in chat.
