# Test Report: Phase 11 (Authentication)

- **Date:** 2026-10-06
- **Branch:** `feature/phase-11-auth`
- **Run by:** Claude Code, on the owner's machine
- **Machine:** Windows 11 Pro + WSL2 Ubuntu (kernel 6.18.33.2-microsoft-standard-WSL2); Playwright's Chromium (build 1243), headless, inside WSL
- **Node / npm:** v24.21.0 (nvm, from `.nvmrc`) / 12.1.0; **no new dependencies**; `npm audit`: 0 vulnerabilities
- **Backend:** tag `phase-34-complete`. The backend stack was **not running** when this phase's E2E began (the backend team's had been stopped), so I **started it from `../ecomdemo-backend-readonly`** at exactly the pinned tag and stopped it at the end with `docker compose --profile tools down` (no `-v`). `api:check` matches all 5 snapshots on it, which also confirms that the earlier mismatch (a `dltTimestamp` field on an admin response) was the backend team's unreleased work and not a regression here. Backend sync before the phase: `origin/main` unchanged (six test and line-ending commits past the pin), no newer tag.

## 1. Full regression

| Command | Result |
|---|---|
| `npm ci` | exit 0; `npm audit`: 0 vulnerabilities |
| `npm run verify` | exit 0: typecheck, lint (0 warnings), Prettier, `check:tokens`, **40 files, 578 tests passed** (was 34 files, 450), 0 skipped; build `index-BywOjzKl.js` 515.26 kB (161.44 kB gzip; was 507.84 / 158.77) and `index-ClsMI-8m.css` 17.22 kB (4.06 gzip), plus the two lazy chunks. Vite now prints its "chunks larger than 500 kB" notice for the main chunk (see section 6) |
| `npm run test:coverage` | exit 0; **99.84 / 96.8 / 100 / 100** (statements / branches / functions / lines; was 99.54 / 96.12 / 100 / 100). The floor in `vite.config.ts` is raised to 99.83 / 96.78 / 100 / 100 |

New and changed tests (128 more than before, none removed or skipped): `session.test.ts` (the store: start, end, reasons, subscribe, a stable snapshot, the late-401 rule, `firstName`, `expiryOf`); `nextPath.test.ts` (every unsafe `next` and the round trip); `auth.flow.test.tsx` 32 (guards with `next`; "Not permitted" in place with its own tab title; a 401 mid-session ends the session, keeps the draft and returns, and the new token is the one sent afterwards; a late 401 for an old token; a 403, a 5xx and a lost connection do not end it; the clock with fake timers: warning, expiry, a laptop that slept, a fresh clock for a new session, the warning removed when the session ends; the cache cleared on sign-out, expiry and rejection); `AccountMenu.test.tsx` 8; `useFormDraft.test.tsx` 5; `SessionProvider.test.tsx` (a login or profile that answers oddly leaves nobody signed in and no token behind; `useSession` outside the provider); `SignInPage.test.tsx` rewritten (47: `next`, unsafe `next`, why a session ended, an already signed-in visitor, the 429 countdown with a faked clock, the token nowhere including the console) plus `formatWait`; `client.test.ts` +6 (the refused-token hook). Changed to match guarded routes: `router.test.tsx` (the guarded pages are rendered signed in; the cart link signed out leads to sign-in).

⚠️ **A test of mine was vacuous and hid a real bug.** My first "the session ends" test rendered a route with no layout, so the expiry notice was never in the page; the E2E run then showed the "You'll be signed out in a minute" notice still on the sign-in page. Cause: an edit that was meant to derive the warning from the session had silently not applied (Prettier had re-wrapped the line it matched on) and I had not verified it. Fixed, and a new test renders the real layout; I confirmed that it fails without the fix and passes with it.

## 2. End-to-end suite (`npm run e2e`)

Exit 0, **310 passed** (11.9 s; the same on three runs), 0 skipped, 0 flaky (was 273). Starts with `api:check`. New, `e2e/auth.spec.ts` 7 against the real backend: sign in, the header shows the name, sign out, `/orders` redirects to `/sign-in?next=%2Forders`, sign in, back on `/orders`; a protected page keeps its query through the round trip; a reload signs the person out and the sign-in page says so; **the token is nowhere** (storage, cookies, address and page text, with the real token read from the login response); a customer on `/admin` sees "Not permitted" in place with its own tab title; the expiry (the page's clock moved on: the warning at 14:10, the sign-out at 15:10, back on sign-in with the page remembered and the reason shown); a stubbed throttled login (countdown, disabled, enabled again after the wait, "You can try again now."). Plus the layout matrix over three new screens (`account-menu` open, `not-permitted`, `sign-in-throttled`): 30 checks. Guarded screens in the matrix and in `routes.spec.ts` are opened by signing in through the app with stubbed answers (`visit()` in `e2e/screens.ts`), because a session dies with a page load.

⚠️ **Side effects on the backend:** as in Phase 10, each run registers real accounts (`e2e-<time>-<random>`, about nine per run now) and fails exactly **one** real sign-in (in `accounts.spec.ts`; none of the new specs fails a login). The 429 is stubbed. The API has no delete.

## 3. Acceptance (Done when)

| Check | Result | How |
|---|---|---|
| Protected routes cannot be reached signed out | ✅ | unit tests for all five customer routes and the console; E2E against the real backend |
| An expired token returns the user to where they were | ✅ | a past `expiresAt` in a component test (fake timers); E2E with the page's clock moved on; the 401 path in a unit test with the draft restored. (A short `JWT_EXPIRY` backend run was not needed: the clock is the page's) |
| A customer on `/admin` sees "Not permitted" | ✅ | unit and E2E; the address stays `/admin` |
| No token in `localStorage`, the URL, or any log | ✅ | unit (storage, cookies, address, page, console spies) and E2E (the real token) |
| Expiry: a warning a minute before, sign-out at expiry or on any 401, route and unsent input kept, back after signing in | ✅ | section 1 and 2 |
| 403 is never a login prompt | ✅ | unit: a 403 neither ends the session nor redirects |
| Guards for `/cart`, `/checkout`, `/orders`, `/orders/:id`, `/account` (customer) and `/admin/*` (admin) | ✅ | `src/app/router.tsx`; unit and E2E |
| Header: Sign in / first name and a menu / Admin only for ADMIN | ✅ | `AccountMenu.test.tsx`, `auth.flow.test.tsx`, E2E, screenshots |
| Sign out is client-side and clears the person's cached data | ✅ | unit: everything but the catalogue is removed, on sign-out, expiry and rejection |
| Login 429 with `Retry-After` shows the wait | ✅ | unit with MSW and a faked clock; E2E with a stub |
| Phase 10's placeholder message removed | ✅ | the sign-in page goes on to `next` instead |
| `docs/architecture/auth-flow.md`, `docs/modules/auth.md` | ✅ | |

## 4. The application, against the backend

| Check | Result |
|---|---|
| `npm run preview` (via Playwright's `webServer`), real sign-ins through the proxy | the whole suite; the console guard fails any error or React warning |
| A real login, then `GET /api/customers/me` with the new token | E2E: the header shows "Account: E2E" (the profile's first name) |

## 5. Widths and themes

The matrix passed at 360, 480, 768, 1024 and 1280 px, light and dark, for every screen including the signed-in ones and the three new ones: no sideways scroll, no clipped text. Screenshots at 360 and 1280 px in both themes are in [`phase-11/`](phase-11/). I looked at the account menu open at 360 px (light) and "Not permitted" at 360 px (dark) myself: the list sits under its button, and at narrow widths only the person icon shows (the design's rule for ghost buttons in the header), with the name in the accessible label.

## 6. Things to know

- ⚠️ **Not done, on purpose:** the E2E in `docs/backend/phase-33-delta.md` that "the sixth wrong password in a row for one username shows the wait". It would burn the 20 failed logins per 15 minutes that this whole machine shares. The countdown is covered by unit tests (real behaviour, faked clock) and one E2E with a stubbed 429.
- ⚠️ **No page makes an authenticated call yet** (the cart is Phase 12), so there is no E2E for "a 401 in the middle of a session" against the real backend. It is covered in unit tests with a page of the test's own, standing in for the protected forms later phases build, and with the real API client and a mocked backend.
- **Bundle:** the main chunk is now 515 kB (161 kB gzip), and Vite warns about chunks over 500 kB. Most of the growth since Phase 9 is Zod and React Hook Form (Phase 10) and now the session code. Suggestion, not built: load the account pages lazily like `/checkout` and `/admin`.
- A reload signs the person out: that is the design (memory only), and the sign-in page says so. The alternative (`sessionStorage`) is recorded in `docs/decisions.md` with why it was not chosen.
- The expiry clock follows the browser's clock for the warning and the end, but the server decides: if the browser's clock is wrong, a 401 ends the session anyway.
- Owner TODOs: none new.

## 7. Clean-up

The backend stack I started was stopped with `docker compose --profile tools down` (no `-v`); no service containers remain. Dev server not left running. `git status` clean apart from the owner's untracked guide.
