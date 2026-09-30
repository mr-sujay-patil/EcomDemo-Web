# Phase 0: Repository Bootstrap

| | |
|---|---|
| **Stage** | Stage 1: Foundation |
| **Technology** | Git + GitHub + GitHub CLI |
| **Branch** | `main` (bootstrap commit only) |
| **PR title** | `Phase 00: Repository Bootstrap` |
| **Requires** | None (first phase). The package (`CLAUDE.md`, `docs/`, `design-system/`) is unzipped in `~/projects/EcomDemo-Web` |
| **Needs from the backend** | none |
| **Completion tag** | `phase-00-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** Create the `EcomDemo-Web` repository, the read-only link to the backend, and the rules every later phase depends on. This is the **only** phase that commits directly to `main`, because `main` must exist before a branch can be cut from it.

**Starting point:** the folder already contains this package. Do not rewrite these files; commit them as they are.

**What you'll implement**
- `git init -b main`. Set the repo-local Git identity from `docs/process/development-environment.md`.
- The read-only backend clone, exactly as `development-environment.md` gives it: clone to `../ecomdemo-backend-readonly`, check out the pinned tag `ki-001-fixed`, disable its push URL. Prove the lock: `git -C ../ecomdemo-backend-readonly push` fails locally. Never touch `~/projects/ecomdemo`.
- Add the remaining bootstrap files:
  - `README.md`: what this is (the storefront and admin console for the EcomDemo backend), links to the backend repository, `docs/ROADMAP.md` and `docs/backend/integration-guide.md`, and a "Current status" line.
  - `.gitignore`: `node_modules/`, `dist/`, `coverage/`, `playwright-report/`, `test-results/`, `.vite/`, `.env`, `.env.*` except `.env.example`, editor and OS files.
  - `.env.example`: `API_TARGET=http://localhost:8080` and `BACKEND_DIR=../ecomdemo-backend-readonly`, each with a comment.
  - `.gitattributes`: `* text=auto eol=lf`.
  - `.github/pull_request_template.md`: the backend's template, adapted: Phase (or Fix KI-XXX); What changed; How it was tested (`npm run verify` counts, `npm run e2e`, backend tag tested against, link to the test report); Screenshots (360 px and 1280 px, light and dark); Owner TODOs; Backend asks; Concepts learned; the same checklist (tests green, E2E green, docs updated, no secrets, only this scope, merge with a merge commit, do not delete the branch).
- One initial commit on `main`: `chore: bootstrap repository and roadmap`.
- `gh repo create EcomDemo-Web --source . --push` (ask the user public or private first; the backend is public).
- **STOP** and ask the user to apply the GitHub settings and create the backend clone's `.env` (see "Your manual steps").
- After `done`, verify through the API: `gh api repos/{owner}/{repo}` shows `delete_branch_on_merge: false`, `allow_squash_merge: false`, `allow_rebase_merge: false`, `allow_merge_commit: true`; `gh api repos/{owner}/{repo}/branches/main/protection` shows protection with `enforce_admins: true` (backend decision [Phase 00]: otherwise the owner is exempt). Check the backend stack starts from the clone (or is already running) and `curl -s localhost:8080/api/products` answers 200.
- Tag `phase-00-complete`, push the tag, and stop with a short report. Marking Phase 0 ✅ in the tracker happens as the first commit on Phase 1's branch.

**Concepts to understand**
- A second repository with a contract instead of shared code
- Branch protection and admin enforcement
- Read-only by construction: a disabled push URL and no collaborator access
- Annotated tags as phase markers

**Done when**
- The repository exists on GitHub with all bootstrap files on `main`; a direct push to `main` is rejected (tried and shown).
- Branch deletion is off and only merge commits are allowed (`gh api`).
- `../ecomdemo-backend-readonly` is at `ki-001-fixed` and a push from it fails locally.
- Tag `phase-00-complete` is on GitHub.

**Not in this phase:** `package.json`, Node tooling, application code.

## E2E additions (`e2e/`)

Not applicable; Playwright arrives in Phase 3.

## Your manual steps (user)

`gh auth login` before kickoff. When Claude Code stops: apply the GitHub settings in the UI (branch protection on `main`: require a PR, block force pushes, block deletion, include administrators; disable "Automatically delete head branches"; allow merge commits only). Create `../ecomdemo-backend-readonly/.env` from its `.env.example` (at least a 32+ character `JWT_SECRET`), never committed. Then reply `done`.
