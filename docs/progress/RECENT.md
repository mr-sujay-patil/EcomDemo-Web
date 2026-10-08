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

## Phase 15: Semantic Search (tag: phase-15-complete, PR pending)
**What exists now:** The header search box is a combobox: after a 300 ms pause it shows the top five suggestions (arrow keys, Enter opens one; Enter with none highlighted goes to `/search?q=…`). `/search` takes `q`, `category`, `minPrice`, `maxPrice` from the URL, asks `GET /api/products/search` for 20, and shows the results in the server's order with no similarity. A 503 gives an `info` Alert and a word match over the loaded catalogue, and the caption says which mode was used. The old Phase 15 placeholder is gone.
**Key code:** `src/features/search/` (`search.ts`, `api.ts`, `useDebouncedValue.ts`, `SearchBox.tsx`, `SearchPage.tsx`, `search.css`), the `search` slot on `components/Header`, `docs/modules/search.md`, decisions [Phase 15].
**Config & infrastructure:** no new dependencies. Coverage floor 99.89 / 97.6 / 100 / 100. `searchHandlers` in `src/test/msw/handlers.ts` (default success ranks the fixtures backwards on purpose; `unavailable` is the 503). `unavailableResponseError` in `e2e/screens.ts`: the browser logs a 503 itself.
**Tests:** 704 unit and component (was 662); E2E 344 (was 310): `e2e/search.spec.ts` (4) and three search screens in the matrix (`search-results`, `search-fallback`, `search-suggestions`).
**Backend tested against:** `phase-34-complete`, started from the clone with `CUSTOMER_DB_PORT=15435` (a Windows app held 5435). Semantic search answered 200 with real similarities, so the full path ran.
**Gotchas:** In MSW tests a `server.use('/api/products/:id')` override also catches `/api/products/search`; scope it to one id. The header box now has role `combobox`, not `textbox`. The search E2E accepts results or the fallback, because the backend decides.
**Owner TODOs open:** unchanged from Phase 14.
**Backend asks:** none.
**Follow-ups (not done, out of scope):** search analytics (the phase says no); a result count above 20 would need backend paging; web KI-019 and KI-020 still to relay.

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
