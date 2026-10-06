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

## Phase 09: Design System (tag: phase-09-complete, PR #12)
**What exists now:** The approved look is code. Paper-coloured pages, self-hosted fonts, light and dark (follows the system until the header's **Theme** button is used; the choice is kept in `localStorage`), seventeen components, every existing page restyled, `/styleguide` (dev and E2E preview only), and a token check in `verify`. Product photos come from the API's `imageUrl` (backend `phase-34-complete`), with a "Photo to come" well for `null` or a failed load. The shelf filters with category `Chip`s; its h1 is "Everything for the desk".
**Key code:** `src/styles/tokens.css` (tokens, `--fs-*`/`--lh-*` type scale), `src/styles/base.css`, `src/components/<Name>/` (Icon, Logo, Button + `buttonClass`, StatusBadge, Chip, TextField, QuantityStepper, Price, ProductTile, ProductCard, CartLine, OrderSummary, SagaTimeline, AssistantMessage, StaffNote, Alert, Header), `src/app/{useTheme,ThemeToggle,Layout}`, `scripts/check-tokens.mjs`, `docs/architecture/design-system.md`.
**Config & infrastructure:** `npm run check:tokens` (in `verify`); `VITE_STYLEGUIDE=true` adds `/styleguide` to a build (Playwright sets it); coverage floor 99.39 / 95.77 / 100 / 100; `eslint` `jsx-a11y/aria-role` ignores non-DOM; E2E stubs product images unless `realImages: true` (gateway rate limit 50 req/s).
**Tests:** 362 unit and component (was 188; includes `scripts/`), 247 E2E (was 229).
**Backend tested against:** `phase-34-complete` (the backend team's running stack, two docs-only commits past it).
**Gotchas:** Style new UI with tokens only: `npm run check:tokens` fails on hex, `rgb(`, a px font size, a gradient, an emoji, or an import of Tailwind/Radix/shadcn/Lucide/Heroicons. A router link that must look like a button uses `buttonClass()`. A component takes server numbers (`lineTotal`, `total`); never add prices. `ProductCard` has no button unless `onAdd` is passed. Tab order now has ~10 stops before the first card (header, chips, sort). A new screen goes in `e2e/screens.ts` (the matrix covers it); keep E2E requests per page low (429).
**Owner TODOs open:** `src/content/site.ts`; every paragraph of About, Returns, Shipping, Privacy, Terms; no `StaffNote` is rendered on the shelf or product page until the owner writes one (design `patterns.md`).
**Backend asks:** images (web KI-002) delivered in `phase-34-complete` and used here. Nothing open.
**Follow-ups (not done, out of scope):** the About page photo and real store photography; per-product tab titles; an `<h1>`-aware search page (Phase 15); Add to cart (Phases 11 and 12).

## Phase 08: Server State (tag: phase-08-complete, PR #10)
**What exists now:** The catalogue is real: a shelf with a category filter, sort (name, price either way) and 24 to a page, all in the URL (`?category=&sort=&page=`), and a product page (`/products/:id`) with a stock hint, a disabled Add to cart and "No longer available" for a missing product. Server data lives in the TanStack Query cache.
**Key code:** `src/app/providers.tsx` (`createQueryClient`, `AppProviders`), `src/features/catalog/api.ts` (`catalogKeys`, `productsQuery`, `productQuery`, `useProducts`, `useProduct`, `usePrefetchProduct`), `shelf.ts` (the pure filter, sort, page and URL functions; `stockHint`), `ProductListPage.tsx`, `ProductPage.tsx`, `src/components/ErrorPanel.tsx` (message, correlation id on 5xx and network, Retry), `src/lib/money.ts` (`formatPrice`). Docs: `docs/architecture/state.md`, `docs/modules/catalog.md`.
**Config & infrastructure:** `@tanstack/react-query` 5.104.0. App-wide `retry: false` (Phase 7 retries); catalogue fresh 5 min, no refetch on focus. Coverage floor 99.13 / 92.68 / 100 / 100. Backend pin `phase-33-complete`.
**Tests:** 187 unit and component (was 137), 229 E2E (was 208).
**Backend tested against:** `phase-33-complete`
**Gotchas:** Tests render through `renderRoute(path)` (it gives each render its own query cache). A page uses `useSearchParams`, so it needs a router in tests. A new query key goes in `catalogKeys`-style factories, never inline. The live catalogue has under 24 products, so the pager is browser-tested with a stubbed list. The results areas use an inline `min-height` that Phase 9 replaces with a token class. Prices are only formatted, never computed. A 404 or stubbed 5xx response needs `allowedConsoleErrors` in E2E (the browser logs it).
**Owner TODOs open:** `src/content/site.ts`; every paragraph of About, Returns, Shipping, Privacy, Terms
**Backend asks:** none
**Follow-ups (not done, out of scope):** per-product tab titles; styling (Phase 9); Add to cart (Phase 12); search (Phase 15).
