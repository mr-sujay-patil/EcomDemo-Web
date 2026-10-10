# Module: auth (`src/features/auth/`)

The session, the guards, the header's account menu and the expiry notice. Concepts (where the token lives, 401 versus 403, expiry, returning where you were): `docs/architecture/auth-flow.md`. The sign-in and registration forms are in `docs/modules/accounts.md`.

## Parts

| File | What it does |
|---|---|
| `session.ts` | `createSessionStore`, `firstName`, `expiryOf`; the `Session`, `Role` and `EndReason` types |
| `SessionProvider.tsx` | the provider; the API client hooks; the clock; clearing the query cache; `signIn` and `signOut` |
| `useSession.ts` | the hook |
| `RequireRole.tsx` | the guard (`role="CUSTOMER"` or `"ADMIN"`) |
| `NotPermittedPage.tsx` | "Not permitted", with its own page title (`usePageTitle`, `src/app/pageTitle.ts`) |
| `nextPath.ts` | `signInPath`, `safeNext` |
| `ExpiryNotice.tsx` | the last-minute warning, in the layout under the header |
| `AccountMenu.tsx` | the header's button and list: first name, My orders, Account, Sign out |
| `useFormDraft.ts`, `drafts.ts` | unsent form text that survives a session ending |
| `api.ts` | `login` and `fetchProfile` (`GET /api/customers/me` with the token just received) |

## Routes

| Guard | Routes |
|---|---|
| `RequireRole role="CUSTOMER"` | `/checkout`, `/orders`, `/orders/:id`, `/account` |
| `CartRoute` (its own rule, Phase 24) | `/cart`: the guest cart signed out, sign-in after an ended session, "Not permitted" for an admin |
| `RequireRole role="ADMIN"` | `/admin/*` |
| none | everything else, including `/sign-in` and `/register` |

Signed out: `/sign-in?next=<the page>`. Signed in as the other role: "Not permitted", in place (the address stays). An admin on `/cart` is as not permitted as a customer on `/admin`.

## The header

Signed out: Theme and a **Sign in** link. Signed in: Theme and the person's first name as a button that opens a list (My orders, Account, Sign out); an **Admin** link only for an ADMIN. At narrow widths the name is hidden, as for any ghost button in the header (the design's rule), and the button's accessible name stays "Account: Asha". The list is a disclosure (a button with `aria-expanded`), not an ARIA menu, because its items are links. Escape closes it and returns focus to the button; so does a click outside, and following a link.

## Using it from a page

```tsx
const { session, role, signOut } = useSession()          // who, and what they may see
const { clearDraft } = useFormDraft(form, 'cart-note', ['password'])   // keep unsent text
```

A new protected route goes inside a `RequireRole` group in `src/app/router.tsx`. A new query for a person's data needs no special key: anything not under `['catalog', …]` is dropped when the session ends. A page that must survive an expiry keeps its form in `useFormDraft`.

## Edge cases handled

- A reload signs out (memory only); the sign-in page says so.
- A late 401 for an old token does not end a newer session.
- A 401 from the login itself, a 403, a 5xx and a lost connection do not end a session.
- Sign-in answers with no body, no token, or no expiry: the person stays signed out with a plain sentence. A good login whose profile cannot be fetched leaves no token behind.
- `?next=` that is another site, protocol-relative, a backslash trick, or `/sign-in` itself: the home page.
- Someone already signed in who opens `/sign-in?next=/orders` goes straight on to `/orders`.
- The clock re-checks on `visibilitychange` and window focus (a sleeping laptop).
- Signing out on a guarded page lands on the shelf, not on the sign-in page.

## Tests

`session.test.ts` (the store, `firstName`, `expiryOf`), `nextPath.test.ts`, `auth.flow.test.tsx` (guards with `next`; a 401 mid-session ends the session, keeps the draft and returns; late and stale 401s; 403 and 5xx do not end it; the clock with fake timers: warning, expiry, a sleeping laptop, a fresh clock for a new session; the cache cleared on sign-out, expiry and rejection), `AccountMenu.test.tsx`, `useFormDraft.test.tsx`, `SessionProvider.test.tsx` (odd answers from the backend, `useSession` outside the provider), `src/api/client.test.ts` (the refused-token hook). E2E: `e2e/auth.spec.ts` against the real backend (sign in, name, sign out, `/orders` redirects with `next`, sign in, back on `/orders`; a customer on `/admin`; a reload signs out; the token nowhere; expiry with the page's clock moved on; a stubbed throttled login) and the layout matrix over the signed-in screens.
