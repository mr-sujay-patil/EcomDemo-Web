## Phase

<!-- e.g. Phase 08: Server State — link the phase file: docs/phases/phase-08-server-state.md
     For a fix: Fix KI-XXX: <summary> — link the row in docs/KNOWN_ISSUES.md -->

Phase XX: <Title> — `docs/phases/phase-XX-<slug>.md`

## What changed

<!-- Bullet points, one per "What you'll implement" item (for a fix: the defect, its root cause, the regression test).
     Note new dependencies with versions, new screens and routes, new configuration and any new infrastructure. -->

-

## How it was tested

<!-- Test counts per type (unit / component, E2E), the backend tag tested against, and a link to the report. -->

- `npm ci && npm run verify`:
- `npm run e2e`:
- Backend tag tested against:
- Test report: `docs/test-reports/phase-XX.md`

## Screenshots

<!-- Every new or changed screen at 360 px and 1280 px, light and dark (files under docs/test-reports/phase-XX/). -->

| Screen | 360 px light | 360 px dark | 1280 px light | 1280 px dark |
|---|---|---|---|---|
|  |  |  |  |  |

## Owner TODOs

<!-- Every TODO(owner) placeholder the owner must fill in (CLAUDE.md rule 11), or "None". -->

-

## Backend asks

<!-- Backend changes this work needs, with the web KI id and the backend issue (CLAUDE.md rule 10), or "None". -->

-

## Concepts learned

<!-- 2-4 sentences per concept, tied to the code actually written in this PR. -->

-

## Checklist

- [ ] All tests pass (`npm ci && npm run verify`) — no test was disabled, skipped or deleted
- [ ] E2E smoke passes (`npm run e2e`) against the pinned backend tag
- [ ] Docs updated (README, `docs/decisions.md`, `docs/modules/*`, `docs/progress/*`, ROADMAP tracker → 🔵)
- [ ] Test report written to `docs/test-reports/phase-XX.md`
- [ ] No secrets in code, commits or this description
- [ ] Only this phase's (or fix's) scope is included
- [ ] Merge with **"Create a merge commit"** — not squash, not rebase
- [ ] Do **not** delete the branch after merging
