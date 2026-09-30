# Test Report: Phase 2 (Automated Testing)

- **Date:** 2026-09-30
- **Branch:** `feature/phase-02-testing`
- **Run by:** Claude Code, on the owner's machine
- **Machine:** Windows 11 Pro + WSL2 Ubuntu; headless Chrome (Windows) for the browser checks
- **Node / npm:** v24.21.0 (nvm, from `.nvmrc`) / 12.1.0; TypeScript 7.0.2; Vitest 5.0.3
- **Backend:** tag `ki-001-fixed` (`git describe` in `../ecomdemo-backend-readonly`). The compose stack was **already running** (`ecomdemo-gateway-service` healthy), so it was used as found and left running.

## 1. Full regression

| Command | Result |
|---|---|
| `npm ci` | exit 0; 161 packages; 0 vulnerabilities |
| `npm run verify` (`tsc -b`, `vitest run`, `vite build`) | exit 0; **1 file, 6 tests passed**, 0 skipped; `dist/assets/index-C9J7Gl8Y.js` 221.67 kB (69.43 kB gzip) |
| `npm run test:coverage` | exit 0; statements 91.11 %, branches 74.19 %, functions 91.66 %, lines 97.5 % (thresholds set to these values) |

The production bundle's hash is the same as Phase 1's: no test code or MSW reaches the app.

Unit/component tests (`src/features/catalog/ProductListPage.test.tsx`):

| Test | Proves |
|---|---|
| shows a loading message, then the products | `role="status"` "Loading products…" first, then 3 list items, then the status is gone |
| formats prices in rupees with Indian digit grouping | `₹1,299.00`, `₹1,25,000.50` inside the right product's item |
| shows "Other" for a product without a category | `null` → "Category: Other"; a real category unchanged |
| says so when there are no products | "No products yet." and no list |
| shows the server's error message and the correlation id on a 500 | `ApiError.message` and the response's `X-Correlation-Id` in `role="alert"` |
| shows the correlation id it sent when the server cannot be reached | network error → "Could not reach the server…" and the UUID the request actually sent |

E2E (`npm run e2e`) starts in Phase 3.

## 2. Acceptance (Done when)

| Done when | Result | How |
|---|---|---|
| `npm run verify` runs the tests | ✅ | section 1: the Vitest summary appears between the type check and the build |
| A deliberately broken assertion fails it (shown, then reverted) | ✅ | Changed `'₹1,299.00'` → `'₹1,299.01'` in the test: `npm run verify` exit 1, `Tests 1 failed \| 5 passed (6)`, "Unable to find an element with the text: ₹1,299.01", and the build did not run. Reverted with `git checkout`; `verify` exit 0 |

**Unhandled-request probe** (a temporary test, deleted afterwards): `fetch('/api/not-mocked')` failed the test with "[MSW] Error: intercepted a request without a matching request handler". Found on the way: MSW 3 renamed the option to `onUnhandledFrame`; with the old `onUnhandledRequest` the tests still passed at runtime (the key is ignored, default `'warn'`) and only `tsc -b` caught it.

## 3. The application, against the backend

| Check | Result |
|---|---|
| `curl` through `:5173` (dev) and `:4173` (preview) to `/api/products` | 200, 22 products each; the `X-Correlation-Id` sent (`phase02-check-<port>`) came back unchanged |
| Headless Chrome `--dump-dom` at `:5173` and `:4173` | 22 list items each (Mechanical Keyboard, Wireless Mouse, …) |
| Browser console `:5173` | `[vite] connecting...`, `[vite] connected.`, React's "Download the React DevTools" note. No errors, no React warnings |
| Browser console `:4173` | nothing |

## 4. Widths and themes

No screen changed in this phase (the only source changes are tests and config), so no new screenshots; Phase 1's in `phase-01/` still apply.

## 5. Needs manual verification

None. The states Phase 1 could only check by hand (empty, `null` category, loading) are now covered by the component tests above.

## 6. Clean-up

Dev and preview servers stopped (ports 5173 and 4173 free). The backend stack was not started by this run and was left running as found.
