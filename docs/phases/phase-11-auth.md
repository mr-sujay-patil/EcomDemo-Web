# Phase 11: Authentication

| | |
|---|---|
| **Stage** | Stage 3: Shopping |
| **Technology** | JWT in memory + route guards |
| **Branch** | `feature/phase-11-auth` |
| **PR title** | `Phase 11: Authentication` |
| **Requires** | `phase-10-complete` on `main` |
| **Needs from the backend** | login, register; no refresh token (backend KI-017) |
| **Completion tag** | `phase-11-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** A signed-in customer stays signed in while they shop, protected screens are protected, and an expired session never loses what the user was doing.

**What you'll implement**
- `src/features/auth/session.ts`: the session (the `accessToken`, `expiresAt`, and the profile from `GET /api/customers/me`) **in memory**, behind a context and `useSession`. The API client's middleware reads it; nothing else touches the token. Decide and record whether a reload keeps the session (`sessionStorage`) or signs out (default: signs out, and the sign-in page says so). Never `localStorage`.
- The JWT may be decoded **for display only** (`sub`, `uid`, `roles`, `exp`, as the guide allows); the server re-checks every call. Prefer `expiresAt` and `/api/customers/me` where they carry the same facts.
- Expiry (15 minutes, no refresh: web KI-005): one minute before `expiresAt`, a quiet `Alert` ("You'll be signed out in a minute"); at expiry, or on any **401**: clear the session, keep the current route and unsent form input, go to `/sign-in?next=…`, and return there after signing in.
- **403** is never a login prompt: a "Not permitted" page (e.g. a customer on `/admin`).
- Guards: `/cart`, `/checkout`, `/orders`, `/orders/:id`, `/account` need a signed-in CUSTOMER; `/admin/*` needs ADMIN (from `roles` or `/me`'s `role`).
- Header: "Sign in" when signed out; the first word of `fullName` and a menu (My orders, Account, Sign out) when signed in; an "Admin" link only for ADMIN.
- Sign out is client-side only (drop the token; there is no server logout) and clears customer data from the query cache.
- Login may later answer **429 with `Retry-After`** (backend Phase 33, planned): the sign-in form shows the wait time if it does; tested with MSW now.
- Remove Phase 10's placeholder message. `docs/architecture/auth-flow.md` and `docs/modules/auth.md`.
- Tests: guard redirects with `next`; a 401 mid-session keeps the draft and returns; the expiry warning with fake timers; 403 page; sign-out clears cached data; 429 with `Retry-After` shows the wait.

**Concepts to understand**
- Bearer tokens and JWT structure; decoding is not verifying
- Where to keep a token (memory, `sessionStorage`, `localStorage`, httpOnly cookie) and the XSS trade-offs
- 401 versus 403
- Authorization belongs on the server; the UI only mirrors it

**Done when**
- Protected routes can't be reached signed out; an expired token (a past `expiresAt` in a component test, and a short `JWT_EXPIRY` backend run if the user allows) returns the user to where they were; a customer on `/admin` sees "Not permitted".
- No token in `localStorage`, the URL, or any log.

**Not in this phase:** the cart (Phase 12), the admin console itself (Phase 17).

## E2E additions (`e2e/`)

Sign in → the header shows the name → sign out → `/orders` redirects with `next` → sign in → back on `/orders`; a customer on `/admin` sees "Not permitted".

## Your manual steps (user)

None. Only review, learn, merge, and reply `merged, continue`.
