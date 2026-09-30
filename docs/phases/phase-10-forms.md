# Phase 10: Forms and Validation

| | |
|---|---|
| **Stage** | Stage 2: Application Shell |
| **Technology** | React Hook Form + Zod |
| **Branch** | `feature/phase-10-forms` |
| **PR title** | `Phase 10: Forms and Validation` |
| **Requires** | `phase-09-complete` on `main` |
| **Needs from the backend** | validation rules (guide sections 3, 6, 7) |
| **Completion tag** | `phase-10-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** Forms that are pleasant, accessible and honest about errors: validated in the browser for speed, by the backend for truth.

**What you'll implement**
- A form kit in `src/components/forms/`: `Form`, `Field` (binds a `TextField`: label, hint, error, `aria-invalid`, `aria-describedby`) and `FormError` (an `Alert` for whole-form errors).
- Zod schemas mirroring the backend rules (guide sections 3, 6, 7): register `username` 3-50, letters, digits, `.` `_` `-`; `password` 8-72, no symbol or digit rules; `fullName` required, up to 100; login `username` and `password` required; profile `fullName` up to 100.
- **Register page** (`/register`), fully working: `POST /api/customers/register`. On 400, the Phase 7 helper puts each `"field: message"` on its field; on **409** "username taken" the message goes on the username field; on 201, go to `/sign-in` with the username filled in and a note that the account is ready (registration does **not** sign in; the guide says to call login next).
- **Sign-in page** (`/sign-in`): the form and `POST /api/auth/login`; 401 shows "Wrong username or password". Keeping the token is Phase 11: for now a successful sign-in shows "Signed in. Sessions arrive in the next phase." (removed in Phase 11).
- Behaviour: validate on blur, then on change for touched fields; focus the first invalid field on submit; the submit button shows loading and cannot double-submit; a show/hide password toggle with a proper label.
- Copy in the store's voice (plain, specific; no "Invalid input").
- Tests: schemas; server field-error mapping; focus on the first error; no double submit.

**Concepts to understand**
- Controlled versus uncontrolled inputs
- One schema for type and runtime (`z.infer`)
- Client validation is a convenience; server validation is the rule
- Accessible error messages

**Done when**
- A new customer can register and sign in against the real backend (E2E), and every backend 400 on registration lands on the right field.

**Not in this phase:** keeping the session, guards (Phase 11).

## E2E additions (`e2e/`)

Register a generated username; register it again (409 on the username field); a too-short password (field error); sign in with a wrong password (message); sign in correctly.

## Your manual steps (user)

None. Only review, learn, merge, and reply `merged, continue`.
