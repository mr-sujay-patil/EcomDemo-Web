# Phase 18: Accessibility

| | |
|---|---|
| **Stage** | Stage 5: Quality |
| **Technology** | axe-core + keyboard testing (WCAG 2.2 AA) + visual regression |
| **Branch** | `feature/phase-18-accessibility` |
| **PR title** | `Phase 18: Accessibility` |
| **Requires** | `phase-17-complete` on `main` |
| **Needs from the backend** | none |
| **Completion tag** | `phase-18-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** Prove the shop works for keyboards, screen readers and zoom (WCAG 2.2 AA), and catch visual regressions the layout matrix can't see.

**What you'll implement**
- `@axe-core/playwright` on every route (signed out, customer, admin) in both themes; the build fails on any serious or critical violation. Each suppressed false positive has a comment and a `decisions.md` line.
- Keyboard-only runs of every E2E flow; focus always visible; focus trapped only inside dialogs.
- 200% zoom and a 20 px root font size still pass the overflow checks.
- `prefers-reduced-motion`: the spinner slows; no other motion exists (asserted).
- Visual comparison: `toHaveScreenshot` baselines for the key screens (shelf, product, cart, order CONFIRMED and CANCELLED, sign-in, assistant, admin products) at 360 and 1280 px, light and dark, with deterministic data (MSW) and animations off. Updating baselines is a reviewed change with its reason in the PR.
- `docs/accessibility.md`: what was tested, how, and a manual screen-reader checklist for the user (NVDA on Windows, or VoiceOver/TalkBack on a phone).

**Concepts to understand**
- WCAG 2.2 AA in practice: contrast, focus, names, roles, target size
- What automated checks catch and what needs a person
- Deterministic rendering for visual tests

**Done when**
- axe reports no serious or critical violations on any route in either theme; keyboard-only flows pass; a one-token change (e.g. `--radius-md`) fails the visual baselines (shown, then reverted).

**Not in this phase:** new features.

## E2E additions (`e2e/`)

The axe scans, keyboard-only flows and visual comparisons join the suite.

## Your manual steps (user)

Do one screen-reader pass with the steps in `docs/accessibility.md`, then reply `done` with anything that felt wrong.
