# Test Report: Phase 1 (Baseline App)

- **Date:** 2026-09-30
- **Branch:** `feature/phase-01-baseline-app`
- **Run by:** Claude Code, on the owner's machine
- **Machine:** Windows 11 Pro + WSL2 Ubuntu; Docker 29.8.1; headless Chrome 154 (Windows) for the browser checks
- **Node / npm:** v24.21.0 (nvm, from `.nvmrc`) / 12.1.0; TypeScript 7.0.2
- **Backend:** tag `ki-001-fixed`, started from `../ecomdemo-backend-readonly` with `docker compose up --build --wait` (it was not running). Stopped at the end with `docker compose --profile tools down` (no `-v`), which was also the "backend stopped" check.

## 1. Full regression

| Command | Result |
|---|---|
| `npm ci` | exit 0; 26 packages; 0 vulnerabilities |
| `npm run verify` (`tsc -b`, then `vite build`) | exit 0; `dist/assets/index-*.js` 221.67 kB (69.43 kB gzip) |

Unit and component tests start in Phase 2; E2E in Phase 3. There are none to run yet.

**Strictness probe** (a temporary file, deleted afterwards): `tsc -b` failed as it should, with TS2322 (`noUncheckedIndexedAccess`: `number | undefined` to `number`) and TS4114 (`noImplicitOverride`). An import through `@/` compiled. After deleting the file, `tsc -b` exit 0.

## 2. Acceptance (Done when)

| Done when | Result | How |
|---|---|---|
| `npm ci && npm run verify` passes | ✅ | section 1 |
| The page lists the seeded products through `npm run dev` | ✅ | `curl localhost:5173/api/products` → 200, 10 products; headless Chrome's rendered DOM at `:5173` has 10 list items (Mechanical Keyboard ₹8,999.00, Wireless Mouse ₹2,499.50, 27" 4K Monitor ₹32,999.00, …) |
| …and through `npm run preview` | ✅ | the same checks at `:4173` against the production build: 200, 10 products, 10 list items |
| With the backend stopped, the error state shows, not a blank screen | ✅ | both proxies answer `502` with an empty body (Vite logs `ECONNREFUSED 127.0.0.1:8080`); the page shows "The server could not load the products (HTTP 502)." and "Reference for support: <uuid>" in a `role="alert"` block, at `:5173` and `:4173` |

**Correlation id:** a request through each proxy with `X-Correlation-Id: phase01-check-…` came back with the same id in the response header, so the id the page sends is the one in the gateway's logs.

## 3. Browser console

| Page | Console |
|---|---|
| `:5173`, products listed | 3 info lines: `[vite] connecting...`, React's "Download the React DevTools" note, `[vite] connected.` No errors, no React warnings |
| `:4173`, products listed | none |
| `:5173` / `:4173`, backend down | same as above; the app logs nothing. (Headless Chrome did not report the failed request's network line; a normal Chrome shows "Failed to load resource … 502", which is the network log, not an app error) |

## 4. Widths and themes (screenshots in `phase-01/`)

| Screen | 360 px light | 360 px dark | 1280 px light | 1280 px dark |
|---|---|---|---|---|
| Product list | `product-list-360-light.png` | `product-list-360-dark.png` | `product-list-1280-light.png` | `product-list-1280-dark.png` |
| Error (backend down) | `product-list-error-360-light.png` | `product-list-error-360-dark.png` | `product-list-error-1280-light.png` | `product-list-error-1280-dark.png` |

Dark screenshots were taken with Chrome's `preferredColorScheme=dark` and look the same as the light ones: this phase has no styles (Phase 9), so the page does not opt into a dark `color-scheme`.

**Defect found and fixed in this phase:** at 360 px the support reference (a UUID, which cannot wrap) ran off the right edge after its label. It now sits on its own line (`648b517`, markup only); the screenshots are after the fix.

Only 360 and 1280 px were captured (the phase's requirement); the 480/768/1024 matrix is automated from Phase 3.

## 5. Needs manual verification

- ⚠️ **Category `null` → "Other":** no seeded product has a `null` category (4 ACCESSORIES, 3 PERIPHERALS, 1 each AUDIO, DISPLAYS, STORAGE), and changing backend data needs the admin account (Phase 17). Code path: `product.category ?? 'Other'` in `ProductListPage.tsx`. A component test covers it in Phase 2.
- ⚠️ **Empty state ("No products yet."):** the seeded catalogue is never empty. Same: Phase 2 covers it with a mocked response.
- ⚠️ **Loading state:** shown only for the length of one local request; not captured in a screenshot.

To see any of these by hand: `npm run dev`, open http://localhost:5173, and in DevTools → Network use "Slow 3G" (loading) or block `/api/products` (error).

## 6. Clean-up

Dev and preview servers stopped (`pkill`; ports 5173 and 4173 free). The backend stack this run started is stopped (`docker compose --profile tools down`, no `-v`). `ecomdemo-control-plane` (the backend's kind cluster node) keeps running: it is not part of the compose stack, this run did not start it, and it was left alone.
