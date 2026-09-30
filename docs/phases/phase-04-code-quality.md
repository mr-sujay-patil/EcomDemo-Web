# Phase 4: Code Quality

| | |
|---|---|
| **Stage** | Stage 1: Foundation |
| **Technology** | ESLint + Prettier |
| **Branch** | `feature/phase-04-code-quality` |
| **PR title** | `Phase 04: Code Quality` |
| **Requires** | `phase-03-complete` on `main` |
| **Needs from the backend** | none |
| **Completion tag** | `phase-04-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** One style, enforced by machines, so reviews talk about behaviour instead of formatting.

**What you'll implement**
- ESLint (flat config) with `typescript-eslint` (type-aware rules), React Hooks, `jsx-a11y`, and Playwright's plugin for `e2e/`; Prettier with the ESLint integration that turns off conflicting rules.
- Rules worth explaining in the PR: `no-floating-promises`, `exhaustive-deps`, no `any` (`@typescript-eslint/no-explicit-any` as an error), no `console` except in tests.
- `npm run lint`, `npm run format`, `npm run format:check`; `verify` becomes `typecheck && lint && format:check && test && build`.
- `.editorconfig`; a pre-commit hook is **not** added (CI enforces it from Phase 5; hooks can be bypassed and slow commits).
- Fix whatever the rules find in the existing code, in separate commits from the configuration.

**Concepts to understand**
- Linting versus formatting, and why they are separate tools
- Type-aware lint rules
- Why "no `any`" matters for a typed API client later

**Done when**
- `npm run verify` includes lint and format checks, and a deliberately unformatted file fails it (shown, then reverted).

**Not in this phase:** CI (Phase 5), design-system token checks (Phase 9).

## E2E additions (`e2e/`)

No new checks; the suite must still pass.

## Your manual steps (user)

None. Only review, learn, merge, and reply `merged, continue`.
