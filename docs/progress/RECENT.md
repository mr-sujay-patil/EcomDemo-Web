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

## Phase 14: Orders and Profile (tag: phase-14-complete, PR pending)
**What exists now:** `/orders` is a table of the customer's orders (id, placed, items, total, status badge, the reason for a cancelled one), newest first, ten a page; an order opens at `/orders/:id` (the Phase 13 page). Another customer's order and an unknown id both say "Order not found". `/account` shows username and member-since, edits the full name (`PUT /api/customers/me`; the header follows), and says there is no password change.
**Key code:** `src/features/orders/` (`OrdersPage.tsx`, `orders.css`), `src/features/accounts/ProfilePage.tsx` + `api.ts` (`fetchMe`, `updateMe`), `session.updateProfile`, `OrderPage` (403 and 404 alike), `docs/modules/orders.md`, `docs/modules/account.md`, decisions [Phase 14].
**Config & infrastructure:** no new dependencies. Coverage floor 99.88 / 97.5 / 100 / 100. `stubAccount` in `e2e/screens.ts` also stubs `GET /api/orders` (three orders, one cancelled with a long reason) for the screen matrix and screenshots.
**Tests:** 662 unit and component (was 641); E2E 310, 309 pass and 1 fails on stock data (web KI-020) (was 305: `e2e/orders.spec.ts` adds 5 specs, 3 orders and 2 profile; the orders and account screens are now in the screenshot report).
**Backend tested against:** `phase-34-complete` pin, but the stack used was the backend team's running one, ahead of the pin (its dead-letter schema has `dltTimestamp`). `npm run e2e` stops at `api:check` on that stack; the Playwright suite was run directly. Backend `origin/main` is past the pin by KI-002/040/044/045/046 fixes and docs, none for orders or customers.
**Gotchas:** The narrow orders table renders the status twice (wide column and under the date; CSS shows one), so unit tests see both. A visually hidden `<caption>` fails the clipped-text check: the table is named with `aria-label`. The session is in memory: a second person in an E2E reaches an order through `/sign-in?next=`. The shared backend's Laptop Sleeve has stock 0, so the "refused order" checkout spec cannot run (web KI-020).
**Owner TODOs open:** `src/content/site.ts`; every paragraph of About, Returns, Shipping, Privacy, Terms; `src/content/notes.ts` `orderConfirmedNote`; no `StaffNote` on the shelf or product page.
**Backend asks:** none new (web KI-019 from Phase 12 still to relay; no password change is backend KI-018).
**Follow-ups (not done, out of scope):** a status filter on My orders; load the account pages lazily (main bundle 518 kB); make the stock-refusal E2E independent of seed data (web KI-020).

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
