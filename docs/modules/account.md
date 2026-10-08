# Module: account profile (`src/features/accounts/ProfilePage.tsx`)

The signed-in customer's own details at `/account`. Backend: `docs/backend/integration-guide.md`, "Accounts". Sign-in and registration are `docs/modules/accounts.md`. Decisions: `docs/decisions.md` [Phase 14].

## Parts

| File | What it does |
|---|---|
| `ProfilePage.tsx` | `/account`: reads `GET /api/customers/me`, shows username and member-since date, edits the full name |
| `api.ts` | `fetchMe`, `updateMe` (`PUT /api/customers/me`) |
| `schemas.ts` | `profileSchema`: the trimmed name, 1 to 100 characters |
| `auth/session.ts` | `updateProfile`: swaps the profile in the session store; the token and its clock are untouched |

## Rules

- **Full name only.** The backend accepts nothing else. Username is shown, not editable.
- **No password change** (web KI-006, backend KI-018): the page says so in a sentence. There is no disabled form pretending to work.
- **The server's answer wins.** After a save the form and the header (`Account: <first name>`) take the name the server returned, not what was typed.
- **Errors.** The schema catches a blank or over-long name first (the store's words). A 400 from the server lands on the field (`applyServerErrors`); any other failure shows above the form with the support reference.
- **Never retried.** The save is a mutation; a lost reply is shown as an error, and the person presses Save again.
- **Key** `['account', 'me']` does not start with `'catalog'`, so signing out removes it.

## Tests

`ProfilePage.test.tsx` (load, trimmed save and header, blank refused with no request, field error keeps the old name, server failure, load error), `session.test.ts` (`updateProfile`), `e2e/orders.spec.ts` (rename through the real server; a 101-character name is refused).
