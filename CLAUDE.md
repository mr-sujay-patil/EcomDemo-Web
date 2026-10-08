# CLAUDE.md: EcomDemo Web

The storefront and admin console for the EcomDemo backend, built by a separate team, **one technology per phase**, starting at Phase 0. The user is learning; explain the "why" behind decisions.

**Stack:** TypeScript (strict) · React · Vite · npm · Git + GitHub (`gh`)
**Repository:** `EcomDemo-Web` on GitHub (`mr-sujay-patil/EcomDemo-Web`), cloned at `~/projects/EcomDemo-Web`.
**Backend:** the gateway only (`http://localhost:8080`), pinned to the backend tag in `docs/process/development-environment.md`. The contract is `docs/backend/integration-guide.md` plus the live OpenAPI documents. Backend source for questions: `../ecomdemo-backend-readonly`, a clone of https://github.com/mr-sujay-patil/ecomdemo at the pinned tag. **READ-ONLY:** read it to answer doubts (`docs/KNOWN_ISSUES.md`, `docs/decisions.md`, controllers, DTOs, `*IT.java`); never edit, commit, push, or open PRs or issues there. Never touch `~/projects/ecomdemo` (the backend team's working copy). A backend change is requested through the user.

## 🔴 Hard rules (never break; if a rule can't be followed, STOP and ask)

1. Every unit of work gets its own branch cut from the latest `main`, and all its changes are made only there:
   a phase → `feature/phase-XX-<slug>`; a defect from `docs/KNOWN_ISSUES.md` → `fix/ki-XXX-<slug>`;
   a process or docs change outside both → `chore/<slug>` (only when the user asks for it).
2. When the phase or fix is complete: push and raise a PR to `main`, then **STOP** for the user's review.
3. **Never merge** unless the user says `approved, merge it`. Only merge commits (`gh pr merge --merge`), never squash or rebase.
4. Start the next phase or fix only after the user says to continue **and** merge verification proves every change of the previous one is in `main`. One open PR at a time.
5. **Never delete any branch** (local or remote). Never use `--delete-branch`.
6. **Never commit to `main`** (the only exception is the Phase 0 bootstrap commit). Never force-push, never rewrite history.
7. Implement **only** the current phase's or fix's scope. Suggest extras; don't build them. A defect found along the way goes into `docs/KNOWN_ISSUES.md`; it isn't fixed in passing.
8. Never disable or delete tests to get green. Never report a check as passed without running it.
9. Never put secrets in code, commits, PRs, or chat. The user provides them as environment variables.
10. **The backend is read only.** A backend defect or missing capability is reported to the user (naming the phase that needs it) and recorded as a row in this repo's `docs/KNOWN_ISSUES.md` that points at the backend issue ("backend KI-041"). Never work around it silently. A phase whose **Requires** names a backend tag or capability that isn't there does not start.
11. **Never invent human content.** Staff notes, About text, policies' wording, reviews, names and photos come from the user. Leave clearly marked `TODO(owner): …` placeholders and list them in the Phase Review Report.

## 🔁 Session start (always)

Follow the resume sequence in `docs/process/execution-protocol.md` (section 1):
Git state → `docs/progress/CURRENT.md` → `docs/progress/RECENT.md` → **only** the current `docs/phases/phase-XX-*.md`
(or, for a fix, only its row and detail section in `docs/KNOWN_ISSUES.md`).
After auto-compaction, or whenever unsure of the state, rerun this sequence before acting.

## 📂 Where things are

| Need | File |
|---|---|
| Lifecycle, user commands, stop points, the fix track | `docs/process/execution-protocol.md` |
| Git rules, commands, verification checklist | `docs/process/git-workflow.md` |
| Testing before a PR and after a merge | `docs/process/testing-protocol.md` |
| What to load, checkpoint and summary rules | `docs/process/context-management.md` |
| Machine setup, the pinned backend tag, the read-only clone, ports | `docs/process/development-environment.md` |
| The backend contract: endpoints, rules, errors, screen flows, gaps | `docs/backend/integration-guide.md` (`grep` the section you need) |
| How the app is organised: routing, state, API layer, auth flow | `docs/architecture/` |
| One page per feature folder | `docs/modules/<feature>.md` |
| Visual rules, tokens, components, voice (from Phase 9) | `design-system/README.md`, `design-system/patterns.md`, `design-system/HOW-TO-USE.md` |
| Current phase scope | `docs/phases/phase-XX-*.md` (one file) |
| Known defects, gaps, and a fix's scope | `docs/KNOWN_ISSUES.md` |
| In-phase (or in-fix) checkpoint | `docs/progress/CURRENT.md` |
| Last two phases' summaries | `docs/progress/RECENT.md` |
| Long-lived decisions | `docs/decisions.md` (`grep`, don't load in full) |
| Tracker and overview | `docs/ROADMAP.md` (edit the tracker row; don't read in full) |

## 💾 Checkpointing

Update and commit `docs/progress/CURRENT.md` at every step change, after each checklist item, and **before every stop**. Its "Next action" must let a fresh session continue with zero conversation history.

## 🧹 Context hygiene

Don't read other phase files or archives unless needed. Don't paste full logs or files into the conversation; use `grep`, `tail`, `git diff --stat`, and line ranges. Never paste lockfile diffs, `node_modules` paths or full build output.

## ✍️ Conventions

- Package-by-feature under `src/features/<feature>/` (pages, components, hooks, tests together); shared UI in `src/components/`; app wiring in `src/app/`
- API types come only from `src/api/generated/` (never hand-written); one API client module in `src/api/`
- Server state in the query cache, not in component state; the token in memory only
- Money: display the server's `unitPrice`, `lineTotal` and `totalAmount` with `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`; never sum or round prices in JS
- Every screen handles loading, empty and error states; `ApiError.message` is shown to the user; 5xx screens show the `X-Correlation-Id`
- Every screen works from 360 px to 1280 px wide, in light and dark, with no clipped text or sideways scroll
- Accessibility from the first component: keyboard-usable, labelled, visible focus
- From Phase 9, styling is plain CSS on the design-system tokens only: **no Tailwind, no shadcn/ui, no Radix, no CSS-in-JS, no icon libraries (Lucide etc.), no gradients, no emoji in UI, no entrance or scroll animations**; copy follows the voice rules in `design-system/README.md`
- Conventional Commits; stable, current releases of every dependency (no `-rc`, `-beta`, `@next`); exact versions pinned, `package-lock.json` committed
- Build: `npm ci && npm run verify` · E2E smoke: `npm run e2e` (backend running at the pinned tag)

## Workflow rules to reduce cycle time

### Local checks
1. While iterating, run only the relevant checks (typecheck, lint, or the affected unit tests). Run the full npm run verify once, just before opening the PR.
2. To reproduce a CI failure, run the exact command from .github/workflows/ci.yml.

### End-to-end tests
3. Keep the backend stack (../ecomdemo-backend-readonly) running between e2e iterations. Rebuild it only when BACKEND_TAG changes.
4. While debugging, run only the failing spec (npx playwright test <file>). Run the full npm run e2e once, at the end.
5. Run npm run perf only if the change could affect bundle size, page load, or the cart and order flows. Otherwise skip it and state why in the PR description.
6. Never use fixed waits (page.waitForTimeout). Use Playwright's auto-waiting assertions.

### Long-running commands and CI
7. Run any command expected to take more than a few minutes (full e2e, perf, backend build, waiting on CI) in the background, then check its status. Do not block on it in the foreground or let it hit a tool timeout.
8. Before asking me to approve a PR, confirm its CI run is green. If it is red, fix it first.
9. After a merge, do not wait for the main-branch run unless the next task depends on the published image.

### PRs
10. Group related fixes into a single PR where reasonable, instead of one PR per fix.
