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

## Phase 17: Admin Console (tag: phase-17-complete, PR pending)
**What exists now:** `/admin/*` is the owner's console (ADMIN only; a customer sees "Not permitted" and nothing is requested). Sections: Products (table, create, full-replace edit from a fresh copy, delete by typing the name, "Write a description"), Stock (sets a level), Import (header check, five-row preview, upload, `skipCount` and the error-file path, restart), Search index (start the backfill, poll every 2 s), Dead letters (replay once, replay log).
**Key code:** `src/features/admin/` (`AdminPage.tsx` routes the sections inside the one lazy `admin/*` route; `products.ts`, `stock.ts`, `batch.ts`, `saga.ts` are the calls; `api.ts` the hooks; `schemas.ts` the `ProductRequest` rules; `csv.ts`; `ConfirmDialog.tsx`; `failure.ts`), `docs/modules/admin.md`, decisions [Phase 17], web KI-022. `PlaceholderPage` is deleted.
**Config & infrastructure:** no new dependencies. Coverage floor 99.9 / 98 / 100 / 100. `e2e/admin.spec.ts` (4) registers only when `E2E_ADMIN_USERNAME` and `E2E_ADMIN_PASSWORD` are set. `stubConsole` in `e2e/screens.ts` answers the console's reads for a stubbed ADMIN; five stubbed admin screens in the matrix.
**Tests:** 824 unit and component (was 729); E2E 420, 419 pass and 1 fails on stock data (web KI-020) (was 370). The four real-backend admin specs did NOT run (no credentials here).
**Backend tested against:** `phase-34-complete`, started with `CUSTOMER_DB_PORT=15435`. Backend `main` is 31 commits ahead (KI-002/003/004/040/044), not adopted.
**Gotchas:** `POST /api/products/{id}/generate-description` SAVES the text (web KI-022). jsdom's `FormData` cannot travel through Node's `Request`, so import page tests mock `./batch`. The layout check flags `.visually-hidden` text as clipped: use `aria-label` for table names. A `1fr` grid column needs `minmax(0, 1fr)` or a wide table pushes the page sideways. The first `<dialog>` in a page is the assistant's: select the admin one by class.
**Owner TODOs open:** unchanged from Phase 14.
**Backend asks:** web KI-022 (guide says draft, endpoint saves); KI-019, KI-020, KI-021 still to relay.
**Follow-ups (not done, out of scope):** user management (not in the API); a product search or filter in the console; inventory ids in chunks if the catalogue grows past a few hundred (one request carries them all); adopting backend `dltTimestamp` after a pin move.

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
