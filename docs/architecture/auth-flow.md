# Architecture: authentication flow

How a person stays signed in while they shop, how the app notices when they are not, and where the token lives. The backend's side (login, the 15-minute token, no refresh, no server logout) is in `docs/backend/integration-guide.md` ("Authentication and authorization") and web KI-005.

## The picture

```
 sign-in form ──signIn()──▶ POST /api/auth/login ──▶ { accessToken, expiresAt }
                               │
                               ▼
                     GET /api/customers/me  (with the new token)
                               │
                               ▼
              session store (memory): { accessToken, expiresAt, profile }
               │              │                     │
   API client reads the    React reads it      the clock watches expiresAt
   token for every call    (useSession)        └─ warn at -60 s, end at 0
               │
   a 401 to a request that carried a token ──▶ store.reject(token) ──▶ session ends
                                                                      │
              ┌───────────────────────────────────────────────────────┘
              ▼
   RequireRole (guard) sees "no session" ──▶ /sign-in?next=<where they were>
   and the query cache is emptied (the catalogue stays); drafts stay
```

## Where the token lives, and why

In the memory of one module (`src/features/auth/session.ts`): never `localStorage`, never `sessionStorage`, never a cookie, never the URL, never a log line, never a component's state. A reload therefore **signs the person out**, and the sign-in page says so ("You stay signed in while you shop, until your session ends or you reload the page").

| Place | XSS can read it | Survives a reload | Verdict |
|---|---|---|---|
| `localStorage` | yes | yes (and across tabs, for ever) | no: any injected script walks off with it |
| `sessionStorage` | yes | yes (one tab) | no: same exposure, for a convenience the 15-minute token barely needs |
| httpOnly cookie | no | yes | not available: the backend sends a bearer token in the body |
| **memory** | only by a script running in the page right now | no | **chosen**: the smallest window, and the cost is one sign-in per reload |

The tests assert it: after signing in, storage and cookies are empty, the address has no token, the page text has none, and nothing was logged (unit and E2E).

## Decoding is not verifying

A JWT's payload is readable by anyone. The app never decodes it: the expiry comes from the login answer (`expiresAt`) and the name and role from `GET /api/customers/me`. Whatever the app shows or hides because of the role is a courtesy; **the server checks every call**, and a forged role in the browser unlocks nothing.

## The parts

| Part | Job |
|---|---|
| `session.ts` | `createSessionStore()`: the session, why the last one ended (`signed-out`, `expired`, `rejected`), `subscribe` for React, `token()` and `reject()` for the API client. Plain functions, no `this`, because they are handed around as callbacks |
| `SessionProvider.tsx` | Owns one store and one draft store for the app. Gives the API client its token and its 401 handler, runs the clock, empties the query cache when a session ends, and offers `signIn` and `signOut`. Inside the `QueryClientProvider` |
| `useSession()` | `session`, `profile`, `role`, `endedBy`, `expiring`, `signIn`, `signOut` |
| `RequireRole` | A route element: signed out goes to `/sign-in?next=…`; the wrong role sees "Not permitted" in place |
| `nextPath.ts` | `signInPath(location)` builds the redirect; `safeNext(raw)` only accepts a path on this site |
| `AccountMenu`, `ExpiryNotice` | The header's menu; the one-minute warning |
| `useFormDraft` | Keeps a form's text while the session ends, minus the fields it is told to leave out |

The API client (`src/api/client.ts`) stays free of React: `setAccessTokenProvider` and `setTokenRejectedHandler` are its two hooks, and `SessionProvider` fills them.

## 401 and 403

- **401** means "no valid identity". A response of 401 to a request **that carried a token** tells the store which token was refused (`reject(token)`); the session ends only if that is still the token in use, so a late 401 for an old token cannot end a newer session. A 401 to a request with no token (the login's own "wrong password") is not a session event.
- **403** means "valid identity, not allowed". It never ends the session and never leads to sign-in: the guard shows "Not permitted", and a failed call shows its message.
- A 5xx or a lost connection is not an identity problem either.

## Expiry

The token lives about 15 minutes and cannot be refreshed or revoked (KI-005). The clock in `SessionProvider` shows `ExpiryNotice` in the last minute ("You'll be signed out in a minute"), and ends the session at `expiresAt` with the reason `expired`. A laptop that sleeps stops timers, so the check also runs when the page becomes visible or the window gets focus. The warning is derived from the session (no session, no warning), so it cannot outlive it.

## Returning where you were

When a session ends the guard on the current page redirects to `/sign-in?next=<path, query and fragment>`; after signing in the sign-in page goes on to `next`. `safeNext` accepts only a path of this site: no `//host`, no `https://`, no backslash trick, and never `/sign-in` or `/register` (a loop). The sign-in page says why the person is there ("Your session ended, so we signed you out.").

**Unsent input** survives through `useFormDraft`: the values go to an in-memory store as they change and come back when the form mounts again. An expiry or a refused token **keeps** the drafts; a deliberate sign-out **drops** them (the next person at a shared computer must not find them); a password is never drafted.

**Signing out on purpose** goes home first and then ends the session: ending it on a guarded page would send the person to the sign-in page, which is for a session that ended *on* them.

## What the person's data leaves behind

Whenever a session ends, every query in the cache except the catalogue (`['catalog', …]`, the same for everyone) is removed. The rule is "everything not under `catalog` is the person's", so a feature added later is safe by default.

## The guest cart on sign-in (Phase 24)

When a session starts for a CUSTOMER and the browser holds a guest cart, `GuestCartProvider` replays it into the account's cart: it reads `GET /api/cart`, then sends one `POST /api/cart/items` per line under the Web Lock `ecomdemo-guest-cart-replay`, removing each line from storage once the server has it. It runs once per token; an ADMIN's sign-in replays nothing. If the session ends during the replay, nothing more is sent and the rest stays in the browser. Sign-out never copies the account's cart into the browser. Details: `docs/modules/cart.md`.

## A throttled login

Login answers `429` with `Retry-After` after repeated failures (`docs/backend/phase-33-delta.md`). The form shows the wait on the button ("Try again in 28 s"), keeps it disabled, never retries by itself, announces the problem once and "You can try again now." once, and enables the button at zero. A `429` without `Retry-After` is the gateway's general limit: a second.

## Testing it

Unit tests drive `SessionProvider` with fake timers and a store that starts signed in (`renderRoute(path, { signedInAs })`); the E2E suite uses real accounts for the sign-in flows and a stubbed sign-in (`visit(page, path, role)` in `e2e/screens.ts`) to open guarded screens for the layout matrix, because a session dies with a page load.
