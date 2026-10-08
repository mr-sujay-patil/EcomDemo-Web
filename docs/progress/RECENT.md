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

## Phase 18: Accessibility (tag: phase-18-complete, PR pending)
**What exists now:** The shop is checked for WCAG 2.2 AA by machine on every screen: axe (no serious or critical violation, both themes), a keyboard sweep (Tab reaches every control, shows focus, nothing covers it, no trap), keyboard-only flows with a pointer guard, 200% and 400% zoom and a 20 px root font, reduced motion, and 32 exact screenshot baselines. `docs/accessibility.md` holds the manual screen-reader checklist (the owner's step, not done yet).
**Key code:** `e2e/a11y.ts` + `a11y.spec.ts`, `keyboard.ts` (`tabTo`, `activate`, `typeInto`, `tabThroughPage`, `watchPointer`) + `keyboard-sweep.spec.ts` + `keyboard-flows.spec.ts`, `layout.ts` (`expectNoOverflow`, shared with `layout.spec.ts` and `zoom.spec.ts`), `motion.spec.ts`, `visual.spec.ts` + `visual.spec.ts-snapshots/`. Fixes: `Layout.tsx` (sign-in link `aria-label`), `Header.css` (text hides only on links with an icon; tool row wraps), `SearchBox.tsx` (an option holds no link), `AccountMenu.tsx` (closes on `focusin` outside), `admin.css` (file input), `styleguide.css`. Decisions [Phase 18], web KI-023 (fixed).
**Config & infrastructure:** new dev dependency `@axe-core/playwright` 4.13.0 (exact). `playwright.config.ts` compares screenshots exactly (`maxDiffPixels: 0`, animations off). `npm run e2e:baselines` updates the baselines (reason in the PR). `stubConsole` is exported from `e2e/screens.ts` (the shelf and product pictures use it).
**Tests:** 827 unit and component (was 824); E2E 1005, 1004 pass and 1 fails on stock data (web KI-020) (was 420): axe 136, sweep 68, keyboard flows 5, zoom 272, motion 72, visual 32.
**Backend tested against:** `phase-34-complete`, started with `CUSTOMER_DB_PORT=15435`.
**Gotchas:** `addStyleTag` rejects empty CSS. After a blur Chromium keeps the Tab starting point: focus `<body>` (with a temporary `tabindex`) to start a lap at the top. A field's ring is on its wrapper and a card link's on `::after`, so "focus visible" compares the element, three ancestors and their pseudo-elements. A file input needs `width: 100%; min-width: 0` or it widens a 320 px page. `page.goto` loses in-page flags: the pointer guard reports through `exposeFunction`.
**Owner TODOs open:** unchanged from Phase 14; plus the manual screen-reader pass in `docs/accessibility.md`.
**Backend asks:** none new. KI-019, KI-020, KI-021, KI-022 still to relay.
**Follow-ups (not done, out of scope):** Firefox and WebKit projects (axe and keyboard are Chromium only); text-spacing (1.4.12) and forced-colors checks; measuring the focus ring's contrast per surface.

## Phase 17: Admin Console (tag: phase-17-complete, PR #21)
**What exists now:** `/admin/*` is the owner's console (ADMIN only; a customer sees "Not permitted" and nothing is requested). Sections: Products (table, create, full-replace edit from a fresh copy, delete by typing the name, "Write a description"), Stock (sets a level), Import (header check, five-row preview, upload, `skipCount` and the error-file path, restart), Search index (start the backfill, poll every 2 s), Dead letters (replay once, replay log).
**Key code:** `src/features/admin/` (`AdminPage.tsx` routes the sections inside the one lazy `admin/*` route; `products.ts`, `stock.ts`, `batch.ts`, `saga.ts` are the calls; `api.ts` the hooks; `schemas.ts` the `ProductRequest` rules; `csv.ts`; `ConfirmDialog.tsx`; `failure.ts`), `docs/modules/admin.md`, decisions [Phase 17], web KI-022. `PlaceholderPage` is deleted.
**Config & infrastructure:** no new dependencies. Coverage floor 99.9 / 98 / 100 / 100. `e2e/admin.spec.ts` (4) registers only when `E2E_ADMIN_USERNAME` and `E2E_ADMIN_PASSWORD` are set. `stubConsole` in `e2e/screens.ts` answers the console's reads for a stubbed ADMIN; five stubbed admin screens in the matrix.
**Tests:** 824 unit and component (was 729); E2E 420, 419 pass and 1 fails on stock data (web KI-020) (was 370). The four real-backend admin specs did NOT run (no credentials here).
**Backend tested against:** `phase-34-complete`, started with `CUSTOMER_DB_PORT=15435`. Backend `main` is 31 commits ahead (KI-002/003/004/040/044), not adopted.
**Gotchas:** `POST /api/products/{id}/generate-description` SAVES the text (web KI-022). jsdom's `FormData` cannot travel through Node's `Request`, so import page tests mock `./batch`. The layout check flags `.visually-hidden` text as clipped: use `aria-label` for table names. A `1fr` grid column needs `minmax(0, 1fr)` or a wide table pushes the page sideways. The first `<dialog>` in a page is the assistant's: select the admin one by class.
**Owner TODOs open:** unchanged from Phase 14.
**Backend asks:** web KI-022 (guide says draft, endpoint saves); KI-019, KI-020, KI-021 still to relay.
**Follow-ups (not done, out of scope):** user management (not in the API); a product search or filter in the console; inventory ids in chunks if the catalogue grows past a few hundred (one request carries them all); adopting backend `dltTimestamp` after a pin move.
