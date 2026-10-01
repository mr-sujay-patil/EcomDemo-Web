# Test Report: Phase 8 (Server State)

- **Date:** 2026-10-01
- **Branch:** `feature/phase-08-server-state`
- **Run by:** Claude Code, on the owner's machine
- **Machine:** Windows 11 Pro + WSL2 Ubuntu (kernel 6.18.33.2-microsoft-standard-WSL2); Playwright's Chromium (build 1243), headless, inside WSL
- **Node / npm:** v24.21.0 (nvm, from `.nvmrc`) / 12.1.0; **new:** `@tanstack/react-query` 5.104.0; react-router 8.4.0; openapi-fetch 0.17.0; TypeScript 6.0.3; Vitest 5.0.3; Playwright 1.63.0
- **Backend:** tag `phase-33-complete` (printed by the E2E global setup). No stack was running, so this run **started it** from `../ecomdemo-backend-readonly` and stopped it at the end with `docker compose --profile tools down` (no `-v`). It held 14 products (the 10 seeded, plus 4 probe rows from the backend's own tests).

## 1. Full regression

| Command | Result |
|---|---|
| `npm ci` | exit 0; `npm audit`: 0 vulnerabilities |
| `npm run verify` | exit 0; **9 files, 187 tests passed** (was 7 files, 137), 0 skipped; build `index-t2wANPcq.js` 369.88 kB (115.66 kB gzip; was 331.30 kB: TanStack Query and the catalogue) plus the two lazy chunks |
| `npm run test:coverage` | exit 0; **99.13 / 92.68 / 100 / 100** (statements / branches / functions / lines; was 98.02 / 89.77 / 100 / 99.21). The floor in `vite.config.ts` is raised to these values |

New and changed tests (50 new): `shelf.test.ts` 18 (URL parsing and writing, round trip, categories with "Other" last, filter, both sorts and tie-breaks, 24 a page, clamping, empty, stock hints); `ProductListPage.test.tsx` 24 (was 6: loading, formatting, errors and Retry, filter and sort in the URL, shared links, the back button, pagination, prefetch on hover and on keyboard focus, no form submit); `ProductPage.test.tsx` 13 (loading, details, stock hints, disabled Add to cart, 404 "No longer available", ids that cannot be products make no request, 500 then Retry, opening from the shelf); `router.test.tsx` 33 (one row changed: `/products/1` shows its product, `/products/7` is "No longer available").

## 2. End-to-end suite (`npm run e2e`)

Exit 0, **229 passed** (6.6 s; the same on three consecutive runs), 0 skipped, 0 flaky (was 208). Starts with `api:check`: matches all 5 snapshots. Global setup: `Backend: http://localhost:8080 answers GET /api/products 200; tag phase-33-complete`. New, in `e2e/shelf.spec.ts` (11 tests): filter by `ACCESSORIES` updates the URL, shows the four seeded accessories and not the keyboard, and a reload keeps it; a shared link opens filtered and sorted; sort by price ascending and descending orders the displayed prices and survives a reload; the default sort is by name; the pager (next, reload, previous: **with a stubbed list of 30**, because the live catalogue has fewer than 24 products); a product opens from the shelf by link and Back returns to the same filter; opens by deep URL; hovering a card requests the product before it is opened; an unknown id shows "No longer available" (live 404); `/products/abc` shows it without asking the backend; Retry recovers from a stubbed 503. `screens.ts` gains `product-not-found` and a real product for `product-detail`, so the width and theme matrix (5 widths × 2 schemes) covers both.

## 3. Acceptance (Done when)

| Check | Result | How |
|---|---|---|
| Against the real backend, the shelf shows the seeded products | ✅ | `catalog.spec.ts` (unchanged, 14 products fit one page) and the screenshots |
| Filter, sort and pages work and survive reload | ✅ | filter and sort: against the live backend (`shelf.spec.ts`); pages: with a stubbed 30-product list (the live data has no second page); all three also in the unit tests |
| A product page opens by link and by deep URL | ✅ | `shelf.spec.ts` (link from the shelf, `/products/1` and `/products/4` directly) and `routes.spec.ts` |
| Unknown id: "No longer available" | ✅ | live 404 against the backend, and the invalid-id case |

## 4. The application, against the backend

| Check | Result |
|---|---|
| `npm run preview` (via Playwright's `webServer`) | the whole E2E suite; the console guard fails any error or React warning |
| `npm run dev`, headless Chromium, light and dark, over `/`, `/?category=AUDIO&sort=price`, `/products/1`, `/products/abc` | no errors and no warnings |

## 5. Widths and themes

The matrix passed at 360, 480, 768, 1024 and 1280 px, light and dark, for every screen, including the new ones: no sideways scroll, no clipped text. Screenshots at 360 and 1280 px in both themes are in [`phase-08/`](phase-08/): `product-list`, `product-list-error`, `product-detail`, `product-not-found` (new or changed), plus `cart`, `about`, `not-found` (unchanged since Phase 6). Styling is Phase 9's job: the pages are plain browser defaults.

## 6. Things to know

- ⚠️ The pager is checked in the browser only with a stubbed response, and the live data has no second page. To see it for real, the catalogue needs more than 24 products (the admin console arrives in Phase 17).
- The product page's tab title stays `EcomDemo · Product`, not the product's name (`docs/decisions.md`).
- The stock thresholds ("Only N left" at 5 or fewer) are my choice; change `LOW_STOCK_THRESHOLD` in `shelf.ts` if you want a different nudge.
- ⚠️ Manual check for you: open a product, press Back, and confirm the shelf comes back with the same filter and sort. Then hover a card with the browser's network tab open and see the product request start before you click.

## 7. Clean-up

Dev server stopped (port 5173 free); the backend stack I started was stopped with `docker compose --profile tools down`; no service containers remain. `git status` clean apart from the owner's untracked guide.
