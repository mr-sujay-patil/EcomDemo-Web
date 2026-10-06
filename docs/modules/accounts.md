# Module: accounts (`src/features/accounts/`)

Registration and sign-in forms. Concepts (schemas, server errors, focus, double submit): `docs/architecture/forms.md`. API: `docs/backend/integration-guide.md` ("Accounts", "Authentication"); the types are generated (`src/api/generated/customer.ts`).

## Screens and routes

| Route | Component | What it does |
|---|---|---|
| `/register` | `RegisterPage` | username, password (Show/Hide), full name; `POST /api/customers/register`; on `201` goes to `/sign-in` |
| `/sign-in` | `SignInPage` | username and password; signs in through the session (`docs/modules/auth.md`), then goes on to `?next=` (the shelf by default); counts down a throttled login |

## API calls

| Call | Used by | Answers the page handles |
|---|---|---|
| `POST /api/customers/register` | `registerCustomer` | `201` → sign-in; `400` → each rejected field on its field (`applyServerErrors`); `409` → the message on the username field; other → `FormError` (with the reference for a 5xx or network failure) |
| `POST /api/auth/login`, then `GET /api/customers/me` | `signIn` (`src/features/auth`) | `200` → signed in, on to `next`; `401` → "Wrong username or password." (the same for a wrong password and an unknown username, on purpose); `429` → a countdown on the button (`Retry-After`; a second without it); the rest → the server's message; 5xx and network → message plus reference |

Registration is a mutation (`useMutation`), never retried: a lost reply is not a failed request. Signing in goes through `useSession().signIn`, which is not retried either (the API client never retries a POST).

## The rules (`schemas.ts`, from the guide and the backend DTOs)

| Field | Rule | Message when broken |
|---|---|---|
| `username` | 3 to 50; letters, digits, `.` `_` `-` | "Choose a username." / "Use at least 3 characters." / "Use at most 50 characters." / "Use letters, digits, dots, underscores and hyphens only." |
| `password` | 8 to 72; no symbol or digit rules; not only spaces; never trimmed | "Choose a password." / "Use at least 8 characters." / "Use at most 72 characters." / "A password cannot be only spaces." |
| `fullName` | required, at most 100; trimmed (the trimmed name is sent) | "Enter your name." / "Use at most 100 characters." |
| sign-in `username`, `password` | filled in (not blank) | "Enter your username." / "Enter your password." |
| profile `fullName` | as registration (`PUT /api/customers/me`, Phase 14) | same |

## Flow

Register → on `201` `navigate('/sign-in', { state: { registered: username } })` (`signInState.ts`). Sign-in reads the state (and `?next=`): the username is filled in, a note says "Your account is ready. Sign in to start.", and the cursor is on the password. The state lives in the router's history entry only: reloading the page keeps the form but not the note. Registration does **not** sign anyone in (the guide).

## Edge cases handled

- An empty form: every field says what to do, the first has focus, and nothing is sent.
- Enter or a click while the request runs, even twice in the same instant: one request.
- A taken username focuses the username field; a 400 the browser let through lands on the right fields in the form's order, not the backend's alphabetical one.
- A 4xx from the backend that names no field appears above the form.
- Show/Hide does not submit the form; the field keeps its value.
- Autocomplete: `username`, `new-password`, `current-password`, `name`, so a password manager fills and offers to save.

## Tests

`schemas.test.ts` (every boundary, trimming, messages), `RegisterPage.test.tsx` and `SignInPage.test.tsx` (against a mocked backend: validation, focus, success and navigation, 400, 401, 409, 429, 500, network failure, an empty reply, no double submit, no token kept), `src/components/forms/*.test.tsx` (the kit, and the server-error mapping), E2E `e2e/accounts.spec.ts` against the real backend (register and sign in; the same username twice; a short password; a real 400 body mapped onto its fields; a wrong password; keyboard use).

## Backend behaviour worth knowing

- Login failures are throttled per client address (20 per 15 minutes across everything on one machine, docs/backend/phase-33-delta.md), so the E2E suite fails exactly one real sign-in, with its own username, and the screenshots use a stubbed `401`.
- The E2E suite creates real accounts (`e2e-<time>-<random>`), one or two per run. There is no delete in the API; the admin console (Phase 17) may offer one.
