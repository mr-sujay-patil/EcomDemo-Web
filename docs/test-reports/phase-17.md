# Test Report: Phase 17 (Admin Console)

- **Date:** 2026-10-08
- **Branch:** `feature/phase-17-admin`
- **Run by:** Claude Code, on the owner's machine (Windows 11 + WSL2 Ubuntu; Playwright's Chromium, headless, in WSL)
- **Node / npm:** v24.21.0 (nvm); **no new dependencies**
- **Backend:** pinned `phase-34-complete`. I started the stack from the read-only clone (none was running) with `CUSTOMER_DB_PORT=15435` (a Windows app holds 5435) and stopped it afterwards without `-v`. Backend `main` is 31 commits ahead of the pin (KI-002/003/004/040/044): reported, not adopted.
- **Merge verification of Phase 16** (before branching): PR #20 merged as `d3da037`, tag `phase-16-complete` on it, every branch commit in `main`, CI on `main` green, `npm ci && npm run verify` exit 0.

## 1. Full regression

| Command | Result |
|---|---|
| `npm run verify` | exit 0: typecheck, lint (0 warnings), Prettier, `check:tokens`, **64 files, 824 tests passed** (was 56 files, 729), 0 skipped, build ok |
| `npm run test:coverage` | exit 0; **99.93 / 98.04 / 100 / 100** (was 99.91 / 97.77 / 100 / 100). Floor raised to 99.9 / 98 / 100 / 100. `features/admin` 100 / 98.98 / 100 / 100 |

New tests (95, none removed or skipped): `products.test.tsx` (list, role gating, typed-name delete, create, 400 on fields, edit as full replace, not found, generate with confirmation, Restore previous, 503), `operations.test.tsx` (stock, search index), `import.test.tsx`, `saga.test.tsx`, `states.test.tsx` (every error, empty and Retry, empty bodies), `schemas.test.ts`, `csv.test.ts`, `failure.test.ts`. Two rows of `router.test.tsx` changed because the placeholder heading became the real one (`/admin` is Products, `/admin/products/new` is New product).

## 2. End-to-end suite

`npm run e2e` (including `api:check`): **419 passed, 1 failed** (was 369 + 1). ⚠️ The failure is **web KI-020**, `checkout.spec.ts` "a quantity above stock is refused up front": the Laptop Sleeve's stock is 0 on this stack's database. Same failure as before this phase.

- **New:** five stubbed admin screens in the layout matrix (`admin-products`, `admin-product-form`, `admin-stock`, `admin-import`, `admin-dead-letters`) at 360, 480, 768, 1024 and 1280 px, light and dark: no sideways scroll, no clipped text. `routes.spec.ts` checks the `AdminPage` chunk is requested only on `/admin`.
- ⚠️ **`e2e/admin.spec.ts` (4 specs, real backend) did NOT run.** It needs `E2E_ADMIN_USERNAME` and `E2E_ADMIN_PASSWORD`, which are not set on this machine, so the specs are not registered. They cover create, edit and delete a product; setting a stock level; a CSV with one bad row (`skipCount` 1); a wrong header refused. See "Things to know".
- The customer on `/admin` seeing "Not permitted" is covered by the existing `auth.spec.ts` (real account) and by a unit test that also shows no product request is made.

## 3. Acceptance (Done when)

| Check | Result | How |
|---|---|---|
| ADMIN: create, edit and delete a product | ⚠️ | unit (request bodies, typed-name delete, error states). The real-backend spec is written but did not run (no credentials) |
| ADMIN: set a stock level | ⚠️ | unit (body `{quantity}`, comma-separated ids). Real spec not run |
| ADMIN: import a CSV with one bad row, `skipCount` 1 | ⚠️ | unit with the upload call replaced (jsdom cannot send a `FormData`); the body is checked on its own. The real multipart upload is **not verified** |
| A CUSTOMER on `/admin` sees "Not permitted" | ✅ | unit and E2E (real account) |
| `ProductRequest` validation, the CSV header check | ✅ | unit |
| The description is never saved without an explicit action | ⚠️ | **Cannot be met as written**: the backend saves it (web KI-022). Built as agreed: confirmation first, Restore previous. |
| Search index: 202, poll every 2 s | ✅ | unit (two polls, done, failed, 503) |
| Saga support | ✅ | unit; built against the pinned schema |
| `docs/modules/admin.md` | ✅ | |

## 4. Widths and themes

The matrix passed at 360, 480, 768, 1024 and 1280 px, light and dark, for the five admin screens and every other screen. Screenshots (360 and 1280, both themes) in [`phase-17/`](phase-17/). Two things the screenshots showed that the checks did not, both fixed: the Actions cell's row line did not match its neighbours, and the stock boxes were clipped at 360 px.

⚠️ At 360 px the products table scrolls sideways **inside its own box** (the same rule as My orders), so Edit and Delete are a swipe away on a phone. A product list for phones (cards) is a follow-up if the owner manages the shop from a phone.

## 5. Things to know

- ⚠️ **Web KI-022 (backend):** `POST /api/products/{id}/generate-description` replaces the product's description at once; the guide and the phase file call it a draft. Your choice: warn first, keep the old text in memory, offer Restore previous (the old text is lost when the admin leaves the page). A message for the backend team is in the PR description.
- ⚠️ **To prove the real paths, please run** `E2E_ADMIN_USERNAME=… E2E_ADMIN_PASSWORD=… npx playwright test --project=chromium e2e/admin.spec.ts` with the stack up (change the seeded password first). For CI, the two values must be added as repository secrets and passed to the e2e job; until then those specs are not registered in CI.
- ⚠️ A screen reader was not tried on the dialogs (confirm, delete). Manual: open Delete, listen for the dialog's name, Tab through, Escape.
- **Dead letters** use the pinned schema. Backend `main` adds `dltTimestamp` to a dead letter's identity (KI-040); adopt it with a `chore/pin-backend-<tag>` when you approve one.
- Import: "a row whose name matches an existing product updates it" is stated on the page.
- Stock: `GET /api/inventory` carries every product id in one request; fine for a shop of this size.
- **Owner placeholders:** unchanged. The console's words are interface copy under the voice rules.
- **Not done, on purpose:** user management (not in the API).
