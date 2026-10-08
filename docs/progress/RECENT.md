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

## Phase 16: AI Shopping Assistant (tag: phase-16-complete, PR pending)
**What exists now:** A secondary header button "Ask the shop" (icon only under 640 px) opens a native `<dialog>` sheet: signed out it links to sign-in, an admin is told it is for customers, a customer types a message (Enter sends, 1000 max) and gets "Shop assistant" answers with "Checked: …" titles and one "Thinking…" caption. A `pendingAction` is an offer (product, server price, quantity) with Add it / Not now; only Add it calls `confirm`, then the cart refetches. 404 says expired; 503 says not available and offers a search of the same words.
**Key code:** `src/features/assistant/` (`assistant.ts`, `useConversation.ts`, `AssistantSheet.tsx`, `assistant.css`), the button and sheet in `app/Layout.tsx` (+ `.site-ask` in `Layout.css`), `docs/modules/assistant.md`, decisions [Phase 16], web KI-021.
**Config & infrastructure:** no new dependencies. Coverage floor 99.9 / 97.7 / 100 / 100. `src/test/setup.ts` has a stand-in for modal `<dialog>` (and `Element.scrollTo`) because jsdom lacks them. `assistantHandlers`, `assistantReply` in `src/test/msw/handlers.ts`. `stubProposedProduct`, `assistant-sheet` and `assistant-unavailable` screens in `e2e/screens.ts`.
**Tests:** 729 unit and component (was 704); E2E 370, 369 pass and 1 fails on stock data (web KI-020) (was 344: `e2e/assistant.spec.ts` 6 and two screens in the matrix).
**Backend tested against:** `phase-34-complete`, started with `CUSTOMER_DB_PORT=15435` (a Windows app holds 5435). A model IS configured, but the seeded products are not in the search index, so the assistant answers "the store does not sell …" (see the report).
**Gotchas:** A stubbed sign-in's token is refused by the real gateway even on public calls (401 ends the session), so every request a stubbed screen makes must be stubbed too (the proposal's `GET /api/products/1`). A two-regex `allowedConsoleErrors` is read by Playwright as `[value, options]`: pass one regex. After the browser's last control Tab goes to the browser's own UI, so "focus trapped" means "never on the page behind", not "never leaves the sheet".
**Owner TODOs open:** unchanged from Phase 14.
**Backend asks:** web KI-021 (OpenAPI omits the `null` of `pendingAction`); the ADMIN backfill so the assistant can find products (a manual step, not a defect). Web KI-019 and KI-020 still to relay.
**Follow-ups (not done, out of scope):** streaming; history beyond the session; an "Ask about this product" entry from a product page.

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
