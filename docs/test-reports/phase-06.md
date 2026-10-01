# Test Report: Phase 6 (Routing)

- **Date:** 2026-10-01
- **Branch:** `feature/phase-06-routing`
- **Run by:** Claude Code, on the owner's machine
- **Machine:** Windows 11 Pro + WSL2 Ubuntu (kernel 6.18.33.2-microsoft-standard-WSL2); Playwright's Chromium (build 1243), headless, inside WSL
- **Node / npm:** v24.21.0 (nvm, from `.nvmrc`) / 12.1.0; **react-router 8.4.0** (new, exact); TypeScript 6.0.3; Vitest 5.0.3; Playwright 1.63.0
- **Backend:** tag `phase-33-complete` (printed by the E2E global setup). No stack was running when the E2E run started (the one seen earlier on :8080 had gone), so this run **started it** from `../ecomdemo-backend-readonly` (`docker compose up --build --wait`; the clone's `.env` already held the four Phase 33 values) and stopped it at the end with `docker compose --profile tools down` (no `-v`). This is the first local E2E run at the new pin.

## 1. Full regression

| Command | Result |
|---|---|
| `npm ci` | exit 0 |
| `npm run verify` (`tsc -b`, ESLint `--max-warnings=0`, Prettier check, `vitest run`, `vite build`) | exit 0; **2 files, 38 tests passed** (was 1 file, 6 tests), 0 skipped; build: `index-jS946Czk.js` 323.40 kB (101.66 kB gzip) plus two lazy chunks, `AdminPage-*.js` and `CheckoutPage-*.js` (0.13 kB each) |
| `npm run test:coverage` | exit 0; **94.04 / 75.6 / 96.96 / 98.68** (statements / branches / functions / lines; was 91.11 / 74.19 / 91.66 / 97.5). The floor in `vite.config.ts` is raised to these values |

New unit and component tests (32, in `src/app/router.test.tsx`): every route renders exactly one `h1` and sets its document title (18 rows, including an unknown path and an admin sub-path); a placeholder names its phase; every Returns paragraph is a `TODO(owner)`; header, main and footer landmarks; the skip link is the first Tab stop and moves focus to `<main>`; focus moves to the new `h1` after a navigation but not on first load; each footer link resolves (5); header links work; the footer shows the three `site.ts` placeholders; the production `createAppRouter` reads the address bar and uses the same table.

## 2. End-to-end suite (`npm run e2e`)

Exit 0, **206 passed** (5.3 s), 0 skipped, 0 flaky (was 22). Global setup: `Backend: http://localhost:8080 answers GET /api/products 200; tag phase-33-complete (from ../ecomdemo-backend-readonly)`. The 22 earlier checks are unchanged. New:

- `e2e/routes.spec.ts` (22 tests): every route by direct URL through `npm run preview` (HTTP 200, `h1`, title) for all 16 paths, the home page, an admin sub-path; header and footer navigation without a full reload (a window marker survives); the back button; focus on the new `h1`; the 404 page and its link home; the skip link by keyboard (Tab, Enter, `<main>` focused); **code splitting**: `/` requests neither lazy chunk, `/checkout` requests only `CheckoutPage`, `/admin` then requests `AdminPage`.
- `e2e/screens.ts` lists the 16 new screens, so the width and theme matrix (5 widths × 2 schemes, an overflow and clipped-text assertion) now covers every route: 160 new checks.

## 3. Acceptance (Done when)

| Check | Result | How |
|---|---|---|
| Every route loads by direct URL through `npm run preview` | ✅ | `routes.spec.ts`, section 2 (the preview server answers each deep link with the app) |
| Every route loads by navigation | ✅ | `routes.spec.ts` "by navigation" (header and footer links, back button); unit tests click through footer and header links |
| Every placeholder is listed in the report | ✅ | section 6 |

## 4. The application, against the backend

| Check | Result |
|---|---|
| `npm run preview` (via Playwright's `webServer`) | the whole E2E suite; the console guard fails any error or React warning, none |
| `npm run dev`, headless Chromium, light and dark, over `/`, `/cart`, `/checkout`, `/admin`, `/about`, `/nope` | the first pass printed **a warning**: `No HydrateFallback element provided to render during initial hydration` (a lazy route as the first page; invisible in the production build the E2E suite uses). Fixed in this phase (a `HydrateFallback` on the layout route, "Loading…"); the second pass printed no errors and no warnings |

## 5. Widths and themes

The matrix (section 2) passed at 360, 480, 768, 1024 and 1280 px, light and dark, for every route: no sideways scroll, no clipped text. Screenshots at 360 and 1280 px, both themes, are in [`phase-06/`](phase-06/) for the screens that look different: `product-list`, `product-list-error`, `cart` (stands for every placeholder), `about` (stands for the five content pages) and `not-found`. Styling is Phase 9's job: the pages are deliberately plain browser defaults.

## 6. Placeholders and owner TODOs

Placeholder pages (each shows its `h1` and "This page is built in Phase N."): `/products/:id` (8), `/search` (15), `/cart` (12), `/checkout` (13, lazy), `/orders` (14), `/orders/:id` (13), `/account` (14), `/sign-in` (11), `/register` (10), `/admin/*` (17, lazy).

`TODO(owner)` placeholders, all yours to fill:
- `src/content/site.ts`: operator, contact email, ship-from city (shown in the footer on every page).
- `src/features/content/`: every paragraph of About (3 sections), Returns (4), Shipping (4), Privacy (4), Terms (4).
- A starting point for Returns and Shipping wording: the backend's assistant policy documents in the read-only clone, `assistant-service/src/main/resources/policies/`. Adapt them; they are not copied in.

## 7. Deviations and things to know

- ⚠️ The phase file says lazy loading for "`/admin/*`, `/checkout` and the assistant". The assistant is a widget with no route or component yet, so only the two routes are split; the assistant joins in Phase 16 (`docs/decisions.md`).
- `/privacy` and `/terms` have no phase that builds them; they are structured `TODO(owner)` pages.
- ⚠️ Manual check for you: tab through a page in your browser. The skip link is visible at all times (no CSS until Phase 9), and after you click a link your screen reader (if you use one) should read the new page's heading.

## 8. Clean-up

Dev server stopped (ports 5173 and 4173 free); the backend stack I started was stopped with `docker compose --profile tools down`; no service containers remain. `git status` clean apart from the owner's untracked guide.
