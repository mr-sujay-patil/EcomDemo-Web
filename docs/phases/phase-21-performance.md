# Phase 21: Performance

| | |
|---|---|
| **Stage** | Stage 5: Quality |
| **Technology** | Lighthouse CI + bundle budgets |
| **Branch** | `feature/phase-21-performance` |
| **PR title** | `Phase 21: Performance` |
| **Requires** | `phase-20-complete` on `main` |
| **Needs from the backend** | none |
| **Completion tag** | `phase-21-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** The shop stays fast on a mid-range phone on a slow connection, and a regression fails CI: measure, find the bottleneck, fix it, show the numbers.

**What you'll implement**
- Lighthouse CI against the production image for the shelf, a product page, the cart and an order page: mobile preset, throttled, three runs each, median reported.
- Budgets that fail CI: performance ≥ 90, LCP ≤ 2.5 s, CLS ≤ 0.1, total JS on the shelf ≤ 170 KB gzipped, no chunk over 100 KB gzipped, fonts ≤ 120 KB.
- Bundle analysis as a CI artifact (not an app dependency).
- At least one real improvement with before-and-after numbers (candidates: admin and assistant chunks kept out of the shelf, font preloading, query devtools excluded from production, client-side pagination sizes).
- `docs/performance.md`: method, machine, results, the fix, and what wasn't worth doing.

**Concepts to understand**
- LCP, INP and CLS; lab versus field data
- Code splitting and tree shaking
- Budgets as tests

**Done when**
- All budgets pass in CI; one measured improvement is documented; a deliberately heavy import breaks the budget (shown, then reverted).

**Not in this phase:** a CDN.

## E2E additions (`e2e/`)

No new functional checks; the Lighthouse results go into the test report.

## Your manual steps (user)

None. Only review, learn, merge, and reply `merged, continue`.
