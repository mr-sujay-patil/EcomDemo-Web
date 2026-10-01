# Test Report: Phase 7 (Typed API Client)

- **Date:** 2026-10-01
- **Branch:** `feature/phase-07-api-client`
- **Run by:** Claude Code, on the owner's machine
- **Machine:** Windows 11 Pro + WSL2 Ubuntu (kernel 6.18.33.2-microsoft-standard-WSL2); Playwright's Chromium (build 1243), headless, inside WSL
- **Node / npm:** v24.21.0 (nvm, from `.nvmrc`) / 12.1.0; **new:** `openapi-fetch` 0.17.0, `openapi-typescript` 7.13.0 (dev); react-router 8.4.0; TypeScript 6.0.3; Vitest 5.0.3; Playwright 1.63.0
- **Backend:** tag `phase-33-complete`. No stack was running, so this run **started it** from `../ecomdemo-backend-readonly` (`docker compose up --build --wait`) and stopped it at the end with `docker compose --profile tools down` (no `-v`).

## 1. Full regression

| Command | Result |
|---|---|
| `npm ci` | exit 0; `npm audit`: 0 vulnerabilities (the `overrides` entry for `openapi-typescript` is honoured by `npm ci`) |
| `npm run verify` | exit 0; **7 files, 137 tests passed** (was 2 files, 38), 0 skipped; build `index-BTKLD5WH.js` 331.30 kB (104.34 kB gzip; was 323.40 kB: the client and `openapi-fetch`) plus the two lazy chunks |
| `npm run test:coverage` | exit 0; **98.02 / 89.77 / 100 / 99.21** (statements / branches / functions / lines; was 94.04 / 75.6 / 96.96 / 98.68). The floor in `vite.config.ts` is raised to these values |

New tests (99): `scripts/openapi.test.ts` 15 (formatting and key order, drift detection and its report, the required-properties step, the five committed snapshots are in canonical format); `src/api/client.test.ts` 30 (headers, token, error mapping, retry policy, abort, shared clients); `src/api/access.test.ts` 46 (the rules, and **every operation in the five snapshots has a rule or is listed as not for the frontend**); `src/api/fieldErrors.test.ts` 5; `src/api/errors.test.ts` 3. The product-list tests (6) are unchanged and pass through the new client.

Error mapping proven by `client.test.ts`: 400 (the backend's message with all fields), 401, 403, 404, 409 (message kept, nothing retried); 429 on a GET (retried once after the `Retry-After`, 1 s without one, not retried when it is over 5 s; the second 429 is the answer, with `retryAfter`); 429 on a login POST (carries `retryAfter: 30`, never retried); 500 and 502 (correlation id from the response, else the one sent; generic message without a JSON body); network failure (GET retried once, POST never, `POST /api/orders` never; status 0 and the id it sent); an aborted request (not retried, not wrapped).

## 2. End-to-end suite (`npm run e2e`)

Exit 0, **208 passed** (6.9 s), 0 skipped, 0 flaky (was 206). The run starts with `npm run api:check`: `api:check: the live backend at http://localhost:8080 matches all 5 snapshots`. Global setup: `Backend: http://localhost:8080 answers GET /api/products 200; tag phase-33-complete (from ../ecomdemo-backend-readonly)`. New, in `e2e/api-contract.spec.ts`: every live product has exactly the six properties the generated type promises (the check behind web KI-016), and an unknown product answers 404 with a `{ status, message }` body and an `X-Correlation-Id`.

## 3. Acceptance (Done when)

| Check | Result | How |
|---|---|---|
| A field renamed in a snapshot fails `npm run verify` at compile time | ✅ | Changed `"stockQuantity"` to `"stock"` in `api/openapi/catalog.json` and ran `npm run api:generate`: `npm run verify` **exit 2** at `tsc`, 7 type errors in `src/test/msw/handlers.ts` and `src/api/client.test.ts` (`Type '{ name: string; price: number; stockQuantity: number; }' is not assignable to type '{ category?: string \| undefined; de…`). `npm run api:check` **exit 1**: `catalog differs from api/openapi/catalog.json: first difference at line 153 … snapshot: "stock": { / live: "stockQuantity": {`. Reverted with `git checkout -- api src/api`; `api:generate` then reproduced the generated files byte for byte (no diff); `verify` exit 0 |
| `api:check` passes against the pinned backend | ✅ | section 2 |
| `api:check` fails on a changed snapshot | ✅ | the probe above, and `scripts/openapi.test.ts` (`findDrift`) |
| Phase 1's hand-written type is replaced; MSW handlers typed from the generated types | ✅ | `src/features/catalog/products.ts` re-exports `components['schemas']['ProductResponse']` and calls `catalogApi`; `ProductsRequestError` and the hand-written `ApiError` are gone; `handlers.ts` takes its types from `src/api/generated/catalog` |

## 4. The application, against the backend

| Check | Result |
|---|---|
| `npm run preview` (via Playwright's `webServer`) | the whole E2E suite; the console guard fails any error or React warning, none |
| `npm run dev`, headless Chromium, light and dark, over `/`, `/cart`, `/checkout` | no errors and no warnings; the dev proxy returned the 14 products |

## 5. Widths and themes

No screen changed (the product list renders the same data through the new client), so no new screenshots; the width and theme matrix still passes for every screen (section 2). The latest screenshots are in [`phase-06/`](phase-06/).

## 6. Things to know

- ⚠️ **The generated types differ from the raw documents on purpose.** The backend marks no response property as required, so a plain generation makes every field optional. The generator lists them as required for response schemas (web KI-016); the committed snapshots are exactly what the backend served. The assumption is backed by the backend's JSON settings (no `NON_NULL` anywhere) and by the E2E check above, for the products only: the cart, order, customer and assistant responses are not exercised until their phases.
- `openapi-typescript` 7.13.0 declares the peer `typescript ^5.x`; this repo is on 6.0.3. An npm `overrides` entry makes it use ours (`docs/decisions.md`). Generation was checked to work, and the output is deterministic.
- `DELETE /api/inventory/{productId}` is in the documents but not in the guide; it has no access rule and is listed `notForTheFrontend`. Worth asking the backend team who may call it.
- The `429` for login throttling is documented on the customer document (`/api/auth/login`) and arrives in `ApiError.retryAfter`. The countdown is Phase 11's.

## 7. Clean-up

Dev server stopped (port 5173 free); the backend stack I started was stopped with `docker compose --profile tools down`; no service containers remain. `git status` clean apart from the owner's untracked guide.
