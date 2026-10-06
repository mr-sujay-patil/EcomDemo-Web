# Test Report: Phase 9 (Design System)

- **Date:** 2026-10-06
- **Branch:** `feature/phase-09-design-system`
- **Run by:** Claude Code, on the owner's machine
- **Machine:** Windows 11 Pro + WSL2 Ubuntu (kernel 6.18.33.2-microsoft-standard-WSL2); Playwright's Chromium (build 1243), headless, inside WSL
- **Node / npm:** v24.21.0 (nvm, from `.nvmrc`) / 12.1.0. **No new dependencies** (the design system is plain CSS and the existing React).
- **Backend:** tag `phase-34-complete` (printed by the E2E global setup, from `../ecomdemo-backend-readonly`). The stack that answered was **the backend team's own** (`~/projects/ecomdemo`), already running and reporting `phase-34-complete-2-g40fed61`: two docs-only commits past the tag (backend `origin/main` checked with `git fetch`: only the Phase 34 closeout and KI-046). I did not start or stop it. `api:check` matches all 5 snapshots. It held 14 products, including the backend team's smoke-test products ("Ownership Probe" and others), which appear on the shelf.

## 1. Full regression

| Command | Result |
|---|---|
| `npm ci` | exit 0; `npm audit`: 0 vulnerabilities |
| `npm run verify` | exit 0: typecheck, lint (0 warnings), Prettier, **`check:tokens`**, **29 files, 362 tests passed** (was 9 files, 188), 0 skipped; build `index-l3pkc2gX.js` 386.56 kB (122.42 kB gzip; was 369.88 / 115.66) and `index-COaLkljt.css` 15.85 kB (3.79 gzip), plus the two lazy chunks. No `/styleguide` chunk in this build |
| `npm run test:coverage` | exit 0; **99.4 / 95.78 / 100 / 100** (statements / branches / functions / lines; was 99.13 / 92.68 / 100 / 100). The floor in `vite.config.ts` is raised to 99.39 / 95.77 / 100 / 100 |

New and changed tests (174 new, none removed or skipped): the 17 component suites **124** (roles and labels for each: Decrease and Increase disable at the limits, StatusBadge shows the word and not only a colour, ProductCard disables at stock 0 and has no SKU, StaffNote renders name, role and date, CartLine and OrderSummary show the server's numbers and sum nothing, ProductTile falls back when an image fails, Chip is named "Audio 7", Alert announces by role, Header slots); `check-tokens.test.ts` **36** (every rule fires, near-misses pass, and `src/` itself is clean); `useTheme.test.tsx` 6 (Auto/Light/Dark, `data-theme`, persistence, unknown value, blocked storage); `StyleguidePage.test.tsx` 3; `router.test.tsx` +4 (header search, empty search, skip link, the `/styleguide` row); `ProductListPage.test.tsx` +1 (the Everything chip). Changed to match the new markup, asserting the same things: the catalogue filter tests (chips, not a select), the product page tests (category text), the focus-prefetch test (more tab stops before the first card), the h1 name.

## 2. End-to-end suite (`npm run e2e`)

Exit 0, **247 passed** (7.4 s; the same on three consecutive runs), 0 skipped, 0 flaky (was 229). Starts with `api:check`. New, in `e2e/`: `design.spec.ts` 6 (a product's image is fetched from the gateway with no `Authorization` header and shown; the shelf shows images for products that have one and the well for those that do not; an image that 404s falls back to the well; fonts are served by this origin as `font/woff2` and exactly two are preloaded; the theme follows the system until chosen, an explicit Dark beats a system Light and survives a reload; a saved choice is applied before paint), `routes.spec.ts` +2 (header search; `/styleguide` by URL), and the layout matrix now includes `/styleguide`: 10 more checks.

⚠️ One thing I changed in the suite and why: product image requests are **stubbed by default** (`e2e/fixtures.ts`, option `realImages`). With real images a shelf made about ten requests, and a dozen parallel workers passed the gateway's 50 requests a second per client: 2 of 3 full runs failed with a `429` caught by the console guard. After the stub: 0 of 3. `design.spec.ts` and the screenshots use the real images.

## 3. Acceptance (Done when)

| Check | Result | How |
|---|---|---|
| `/styleguide` and every existing page pass the layout matrix, both themes | ✅ | `layout.spec.ts`: 360, 480, 768, 1024, 1280 px × light, dark × every screen incl. the style guide: no sideways scroll, no clipped text. Screenshots below |
| A hex colour added to a component fails `npm run verify` | ✅ | shown, then reverted: appended `.ed-btn--primary { background: #1d5c4f; }` to `Button.css`; `npm run verify` exit 1 with `src/components/Button/Button.css:93: hex colour in "background": use a colour token` and `check-tokens: 1 problem(s)`, before any test ran. After restoring the file `git status` showed no change and `verify` was green |
| Tokens and self-hosted fonts | ✅ | `src/styles/tokens.css`, `src/styles/fonts/` (7 files, `font-display: swap`); built files are `/assets/*.woff2` served as `font/woff2` (E2E); two faces preloaded in `dist/index.html`; no external font request |
| Theme: `data-theme`, `useTheme`, toggle in the header, persisted | ✅ | unit and E2E tests above |
| All 17 components ported with tests, props typed, no SKU, `image` from `imageUrl` | ✅ | `src/components/*` |
| Every existing page restyled (catalogue, product, layout, footer, 404, placeholders, content pages) | ✅ | screenshots |
| Production build has no `/styleguide` | ✅ | plain `npm run build`: no chunk, no mention in any `.js` |

## 4. The application, against the backend

| Check | Result |
|---|---|
| `npm run preview` (via Playwright's `webServer`, `VITE_STYLEGUIDE=true`) | the whole E2E suite; the console guard fails any error or React warning |
| Screenshots with the real seeded product images | the shelf and product page show the backend's SVG illustrations; products 9, 10 and the probe products show "Photo to come" |

## 5. Widths and themes

Screenshots at 360 and 1280 px in both themes are in [`phase-09/`](phase-09/): `product-list`, `product-list-error`, `product-detail`, `product-not-found`, `cart` (a placeholder), `about`, `not-found` and `styleguide` (the placeholders that look alike are not repeated). I looked at the shelf at 1280 px (light) and 360 px (dark) myself: single column below 600 px, four columns at 1280, the header's search on its own row on a phone.

## 6. Things to know

- ⚠️ **Owner TODOs open** (CLAUDE.md rule 11): `src/content/site.ts` (operator, contact email, ship-from city), every paragraph of About, Returns, Shipping, Privacy and Terms (unchanged from Phase 5). New: the design puts a `StaffNote` on the shelf (a full-width band after the first two rows) and on each product page; I rendered **none**, because the words and the signature must be yours. The component is ready and shown on `/styleguide` with a `TODO(owner)` sample.
- Product images are the backend's seeded SVG illustrations, not photos. The design asks for real photos "shot by the store"; that is yours and the backend team's to supply.
- Deviations from the reference, all in `docs/decisions.md` (`[Phase 09]`) and mirrored in `design-system/`: the type scale as variables, no price arithmetic in `CartLine` and `OrderSummary`, cart-line names wrap, `category` as a string, optional `onAdd`, `Header` slots.
- `design-system/tokens.css` is now a copy of `src/styles/tokens.css` and was reformatted by Prettier on the way (the diff looks large; the tokens are the same plus the new type variables).
- The shelf's h1 is now "Everything for the desk" (from `patterns.md`); the tab title stays "Products".
- The catalogue's Add to cart is still absent on cards and disabled on the product page: Phases 11 and 12.
- ⚠️ Manual checks for you (the phase file's list): open `/styleguide` (`npm run dev`) in both themes on your laptop and on your phone, and press **Theme** in the header. Reply `changes: …` for anything that does not feel like the approved design.

## 7. Clean-up

Dev server not left running (the E2E suite starts and stops its own preview on port 4173); the backend stack was the backend team's and was left as I found it. `git status` clean apart from the owner's untracked guide.
