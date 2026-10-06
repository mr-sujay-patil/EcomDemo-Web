# Recent Phase Summaries (rolling window: last 2 phases)

> Newest first. When a third summary is added, move the oldest to `docs/progress/archive/phase-XX-summary.md`. Maximum ~30 lines per summary: facts only, no narrative.

<!-- TEMPLATE
## Phase XX: <Title> (tag: phase-XX-complete, PR #N)
**What exists now:** <1–3 lines describing the app after this phase>
**Key code:** <features, components, hooks and modules that matter next>
**Config & infrastructure:** <scripts, env vars, ports, proxies, containers, and how to run>
**Tests:** <new unit/component/E2E tests and counts>
**Backend tested against:** <pinned tag>
**Gotchas:** <anything surprising the next phase must know>
**Owner TODOs open:** <TODO(owner) placeholders still waiting for the user>
**Backend asks:** <backend changes reported to the user, with web KI ids>
**Follow-ups (not done, out of scope):** <suggestions deferred to later phases>
-->

## Phase 12: Cart (tag: phase-12-complete, PR pending)
**What exists now:** A signed-in customer adds products from the shelf or a product page, sees "In your cart (n)" and a count on the header's cart link, and manages the cart at `/cart`: change quantity (the stepper moves at once, rolls back with an Alert if refused), remove with a five-second Undo, "price when added" on every line, the server's `lineTotal` and `totalAmount`, an empty state, Checkout to `/checkout`. Signed out, Add to cart goes to `/sign-in?next=<page>` and back; an ADMIN is offered no button.
**Key code:** `src/features/cart/` (`cart.ts` calls, `api.ts` keys and hooks, `useAddAction.ts`, `CartPage.tsx`, `cart.css`), `src/test/msw/cart.ts` (`fakeCart`), `docs/modules/cart.md`, decisions [Phase 12].
**Config & infrastructure:** no new dependencies. Coverage floor 99.85 / 97.06 / 100 / 100. `stubAccount` in `e2e/screens.ts` now also stubs `GET /api/cart` (two lines, one with a long name).
**Tests:** 607 unit and component (was 578), 312 E2E (was 310); `e2e/cart.spec.ts` runs against the real backend.
**Backend tested against:** `phase-34-complete`, stack started from the clone by me (stopped at the end, no `-v`); backend `origin/main` is 18 commits past the pin, none touch the cart.
**Gotchas:** Every cart write ends in `setQueryData(['cart'], answer)`; all writes share the mutation scope `{ id: 'cart' }`. A CartLine sits in a container query, so a grid around it needs an explicit `width: 100%` (the layout matrix cannot see a squeezed layout: look at the screenshots). Undo re-adds at the CURRENT catalogue price (backend snapshots at add time). Any page that asks for the cart with a stubbed token needs `GET /api/cart` stubbed, or the real 401 ends the session. The OpenAPI text for `unitPrice` is stale (web KI-019).
**Owner TODOs open:** `src/content/site.ts`; every paragraph of About, Returns, Shipping, Privacy, Terms; no `StaffNote` on the shelf or product page until the owner writes one.
**Backend asks:** web KI-019: the app's OpenAPI says the cart `unitPrice` is "the catalogue price right now, not a snapshot"; the code snapshots it (backend decisions [Phase 20a]). Cosmetic; to report to the owner.
**Follow-ups (not done, out of scope):** a guest cart (web KI-012); an E2E for a 401 in the middle of a real cart session; the checkout and the stock check (Phase 13); load the account pages lazily (main bundle 518 kB).

## Phase 11: Authentication (tag: phase-11-complete, PR #14)
**What exists now:** A signed-in customer stays signed in while they shop. The session (token, `expiresAt`, profile) lives in memory only: a reload signs out. `/cart`, `/checkout`, `/orders`, `/orders/:id`, `/account` need a CUSTOMER, `/admin/*` an ADMIN; signed out goes to `/sign-in?next=…` and comes back, the wrong role sees "Not permitted" in place. A notice appears a minute before expiry; at expiry or on any 401 (with a token) the session ends, the person's cached data goes, and unsent form text is kept. The header shows Sign in, or the first name with a menu (My orders, Account, Sign out) and an Admin link for ADMIN. A throttled login shows a countdown.
**Key code:** `src/features/auth/` (`session.ts`, `SessionProvider.tsx`, `useSession.ts`, `RequireRole.tsx`, `nextPath.ts`, `AccountMenu.tsx`, `ExpiryNotice.tsx`, `useFormDraft.ts`), `src/features/accounts/SignInPage.tsx` (+ `wait.ts`), `src/api/client.ts` (`setAccessTokenProvider`, `setTokenRejectedHandler`, both take `null`), `src/app/pageTitle.ts`, `docs/architecture/auth-flow.md`, `docs/modules/auth.md`.
**Config & infrastructure:** no new dependencies. `renderRoute(path, { signedInAs })` renders the app signed in; `e2e/screens.ts` has `visit(page, path, role)` (signs in with stubbed answers, no reload) and `stubAccount`. Coverage floor 99.83 / 96.78 / 100 / 100. `eslint` knows `openScreen` asserts.
**Tests:** 578 unit and component (was 450), 310 E2E (was 273).
**Backend tested against:** `phase-34-complete`, started from the clone for this phase (no stack was running); `api:check` matched.
**Gotchas:** A new protected route goes inside a `RequireRole` group. Any query for a person's data must not have a key starting with `'catalog'` (it is dropped when the session ends). Page 'Not permitted' names itself with `usePageTitle`. A page that must survive an expiry keeps its form in `useFormDraft(form, key, ['password'])`. A full page load drops the session: E2E opens guarded screens through `visit()`. `Date.now()` in render is flagged by lint: start timers in handlers (`useCountdown`). Failed logins are throttled per client address; the new specs fail none. Prettier can re-wrap a line and make a scripted `replace` silently not apply: verify edits.
**Owner TODOs open:** `src/content/site.ts`; every paragraph of About, Returns, Shipping, Privacy, Terms; no `StaffNote` on the shelf or product page until the owner writes one.
**Backend asks:** none (the backend team's stack ran an unreleased `dltTimestamp` field on an admin response before this phase; additive, not used here).
**Follow-ups (not done, out of scope):** load the account pages lazily (the main bundle is 515 kB); an E2E for a 401 mid-session once a page makes an authenticated call (Phase 12); the profile form (Phase 14, `profileSchema` is ready).

