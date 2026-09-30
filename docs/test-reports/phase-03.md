# Test Report: Phase 3 (End-to-End Smoke Tests)

- **Date:** 2026-09-30
- **Branch:** `feature/phase-03-playwright`
- **Run by:** Claude Code, on the owner's machine
- **Machine:** Windows 11 Pro + WSL2 Ubuntu (kernel 6.18.33.2-microsoft-standard-WSL2); Playwright's Chromium (Chrome for Testing 153.0.8010.12, build 1243), headless, inside WSL
- **Node / npm:** v24.21.0 (nvm, from `.nvmrc`) / 12.1.0; TypeScript 7.0.2; Vitest 5.0.3; Playwright 1.63.0
- **Backend:** tag `ki-001-fixed` (`git describe` in `../ecomdemo-backend-readonly`, printed by the E2E global setup). The compose stack was **already running** (`ecomdemo-gateway-service` healthy), so it was used as found and left running. During the phase, someone else restarted `ecomdemo-catalog-service` and `ecomdemo-kafka`; one manual `curl` got a 500 in that window, then 200 again. No test run overlapped it.

## 1. Full regression

| Command | Result |
|---|---|
| `npm ci` | exit 0; 164 packages; `npm audit`: 0 vulnerabilities |
| `npm run verify` (`tsc -b` now including `e2e/` and `playwright.config.ts`, `vitest run`, `vite build`) | exit 0; **1 file, 6 tests passed**, 0 skipped; `dist/assets/index-C9J7Gl8Y.js` 221.67 kB (69.43 kB gzip), the same hash as Phases 1 and 2: no test code reaches the app |
| `npm run test:coverage` | exit 0; 91.11 / 74.19 / 91.66 / 97.5 (unchanged; this phase adds no app code) |

## 2. End-to-end suite (`npm run e2e`)

Exit 0, **22 passed** (1.9 s), 0 skipped, 0 flaky. Global setup printed: `Backend: http://localhost:8080 answers GET /api/products 200; tag ki-001-fixed (from ../ecomdemo-backend-readonly)`.

| Spec | Tests | Proves |
|---|---|---|
| `catalog.spec.ts` | 2 | the ten seeded products (by name, each with a price matching `₹[\d,]+\.\d{2}`, e.g. `₹8,999.00`) and no loading status left; with `/api/products` aborted: "Could not reach the server…", a UUID reference, no list |
| `layout.spec.ts` | 20 | `product-list` and `product-list-error` × 360/480/768/1024/1280 px × light/dark: `scrollWidth <= clientWidth`, no `overflow: hidden`/`clip` element cutting off its text |
| (every test) console guard, `e2e/fixtures.ts` | n/a | no `console.error`, React warning or uncaught exception, except errors a test declares (`Failed to load resource: net::ERR_FAILED` for the aborted request) |

`npm run e2e:report`: exit 0, 8 passed; screenshots below.

## 3. Acceptance (Done when) and guard probes

| Check | Result | How |
|---|---|---|
| `npm run e2e` passes against the real backend | ✅ | section 2 |
| A deliberately clipped element at 360 px fails the matrix (shown, then reverted) | ✅ | Added `<style>@media (max-width: 400px) { h2 { width: 120px; overflow: hidden; white-space: nowrap; } }</style>` to `index.html`: `npm run e2e` exit 1, **2 failed / 20 passed**: exactly `product-list at 360 px, light` and `…dark`, listing `<h2> "Mechanical Keyboard" (287×28 in 120×28)`, `<h2> "Wireless Mouse" (209×28 in 120×28)`, … Reverted with `git checkout -- index.html`: 22 passed |
| Backend down: one clear message | ✅ | `API_TARGET=http://localhost:8099 npm run e2e`: exit 1, no tests run, only `Error: The backend is not reachable: GET http://localhost:8099/api/products did not answer (connect ECONNREFUSED 127.0.0.1:8099).` plus the line on how to start it |
| Console guard fails what it should | ✅ | A temporary spec (deleted afterwards): `console.error('probe error')` ✘, `console.warn('Warning: Each child in a list should have a unique "key" prop. React probe')` ✘, an uncaught `throw` ✘, a plain `console.log` ✓ |

## 4. The application, against the backend

| Check | Result |
|---|---|
| `npm run preview` (via Playwright's `webServer`) | the whole E2E suite above; console clean (guard) |
| `npm run dev`, loaded in Playwright's Chromium, light and dark | 22 list items each. Console: `[vite] connecting...`, `[vite] connected.`, React's "Download the React DevTools" note. No errors, no React warnings. (React's development warnings only exist in dev, so this check stays even with the E2E console guard) |

## 5. Widths and themes

Automated: section 2 (`layout.spec.ts`, 20 combinations). Screenshots from `npm run e2e:report` in [`phase-03/`](phase-03/):

| Screen | 360 px | 1280 px |
|---|---|---|
| Product list, light | [product-list-360-light.png](phase-03/product-list-360-light.png) | [product-list-1280-light.png](phase-03/product-list-1280-light.png) |
| Product list, dark | [product-list-360-dark.png](phase-03/product-list-360-dark.png) | [product-list-1280-dark.png](phase-03/product-list-1280-dark.png) |
| Gateway unreachable, light | [product-list-error-360-light.png](phase-03/product-list-error-360-light.png) | [product-list-error-1280-light.png](phase-03/product-list-error-1280-light.png) |
| Gateway unreachable, dark | [product-list-error-360-dark.png](phase-03/product-list-error-360-dark.png) | [product-list-error-1280-dark.png](phase-03/product-list-error-1280-dark.png) |

"Dark" looks the same as light: the app has no CSS and no `color-scheme` yet, so the browser keeps its light defaults. The theme arrives in Phase 9; the matrix already runs both schemes so it covers that work unchanged.

## 6. Manual steps and manual verification

- **`npx playwright install --with-deps chromium` (the phase's manual step): not needed on this machine.** Chromium build 1243, the one Playwright 1.63.0 expects, was already in `~/.cache/ms-playwright` from an earlier install, and it launched headless (`chromium.launch()` → 153.0.8010.12), so its system libraries are present. A fresh machine still needs the command (README).
- ⚠️ **`npm run e2e:ui`** opens a window, so it was not run here. To check: `npm run e2e:ui`, press ▶ on `catalog.spec.ts`, and watch the tests go green with a timeline of each step.

## 7. Clean-up

Dev and preview servers stopped (ports 5173 and 4173 free); temporary probe spec deleted and `index.html` restored (`git status` clean apart from the owner's untracked guide). The backend stack was not started by this run and was left running as found.
