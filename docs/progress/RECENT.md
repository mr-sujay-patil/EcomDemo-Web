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

## Phase 13: Checkout and Order Tracking (tag: phase-13-complete, PR pending)
**What exists now:** The cart's summary button is "Place order" (one click, no address). A 201 opens `/orders/:id`, which says "Placing your order" and polls `GET /api/orders/{id}/status` every 1.5 s until CONFIRMED ("Your order is confirmed.", plus the owner's note once written) or CANCELLED (the server's reason; "Add these items to my cart again"). After 15 s it says it is taking longer; after 90 s it stops checking and points at My orders. A 409 for stock is shown under its cart line with "Lower to n". `/checkout` redirects to `/cart`.
**Key code:** `src/features/checkout/` (`orderStatus.ts` the machine, `orders.ts`, `api.ts`, `stockRefusal.ts`, `OrderPage.tsx`), `src/content/notes.ts`, `CartLine`'s `notice` slot, `src/test/msw/orders.ts` (`fakeOrders`, `orderFixture`), `docs/modules/checkout.md`, decisions [Phase 13].
**Config & infrastructure:** no new dependencies. Coverage floor 99.87 / 97.3 / 100 / 100. `stubAccount` also stubs order 42 (cancelled, long reason and name) for the screen matrix.
**Tests:** 641 unit and component (was 607), 305 E2E (was 312: the retired checkout screen's matrix rows outweigh the 4 new specs).
**Backend tested against:** `phase-34-complete`, stack started from the clone by me (stopped at the end, no `-v`); backend `origin/main` is 16 commits past the pin, none touch orders or the saga.
**Gotchas:** `POST /api/orders` is never retried: after a lost answer the cart and the orders are read (empty cart + an order = it was made). A real E2E purchase takes real stock for good (one Desk Mat per run; the API cannot return it). `/orders/42` is now a real page that calls the API: a spec that visits it needs the stubs or a real order. Only IBM Plex Mono Regular and Medium are bundled: never bold mono. The 409 text is parsed (`Insufficient stock for 'X': requested n, available m`); a different wording shows on top instead of by the line.
**Owner TODOs open:** `src/content/site.ts`; every paragraph of About, Returns, Shipping, Privacy, Terms; `src/content/notes.ts` `orderConfirmedNote` (nothing renders until written); no `StaffNote` on the shelf or product page until written.
**Backend asks:** none new (web KI-019 from Phase 12 still to relay).
**Follow-ups (not done, out of scope):** order history (Phase 14); push updates instead of polling (web KI-013); a "which step failed" field from the backend (the app guesses payment from the reason's words); loading the account pages lazily (main bundle 518 kB).

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
