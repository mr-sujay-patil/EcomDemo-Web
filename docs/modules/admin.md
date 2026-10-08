# Module: admin (`src/features/admin/`)

The shop owner's console at `/admin/*`: products, stock, CSV import, the search index, and (last, optional) the saga's dead letters. Backend: `docs/backend/integration-guide.md`, "Admin console APIs". Decisions: `docs/decisions.md` [Phase 17]. Known issue: web KI-022.

## Parts

| File | What it does |
|---|---|
| `AdminPage.tsx`, `admin.css` | the lazy chunk: a section list (`nav`) and the sections' routes, inside the one `admin/*` route of `app/router.tsx` |
| `ProductsAdminPage.tsx` | `/admin/products`: the table (id, name, category, price, stock), Edit, Delete with a typed-name dialog, a notice after a save |
| `ProductFormPage.tsx`, `schemas.ts`, `TextAreaField.tsx` | `/admin/products/new` and `/admin/products/:id`: create, and edit as a full replace; the rules of `ProductRequest` in `schemas.ts`; the description generator |
| `StockPage.tsx`, `stock.ts` | `/admin/stock`: the level per product (`GET /api/inventory?productIds=1,2,3`) and a box that **sets** it (`PUT /api/inventory/{id}`) |
| `ImportPage.tsx`, `csv.ts`, `batch.ts` | `/admin/import`: header check, preview of the first five rows, upload (`multipart/form-data`, field `file`), the result, restart |
| `SearchIndexPage.tsx`, `batch.ts` | `/admin/search-index`: start the backfill (202) and poll the run every 2 s until it ends |
| `SagaPage.tsx`, `saga.ts` | `/admin/dead-letters`: the dead letters, Replay (once), the replay log |
| `ConfirmDialog.tsx`, `failure.ts` | a native modal `<dialog>` for confirmations; `failureOf` turns any error into "the server's sentence + a support reference" |
| `api.ts` | the query keys and mutations; every product write invalidates `catalogKeys.all` |

## Rules

- **UI gating is not the protection.** `RequireRole role="ADMIN"` shows a customer "Not permitted" and asks the API for nothing; the gateway's 403 is the real rule. The admin link in the header is shown only to an ADMIN.
- **Lazy.** Shoppers never download this code (`e2e/routes.spec.ts` checks the `AdminPage` chunk is requested only on `/admin`).
- **Full replace starts from the server's copy.** The edit form reads the product afresh (`staleTime: 0`, no cache kept), because `PUT` replaces every field and stock moves with orders. Restore previous also reads it again first.
- **Prices are never computed on.** The form holds the text; the schema checks it (at most two decimals, at least 0.01) and passes the number on. The table shows the server's price through `formatPrice`.
- **Stock is a level, not a delta.** The page says so above the boxes and the product form says it under the field.
- **Generate description saves at once** (web KI-022: the backend replaces `product.description` as it answers; the guide's "draft" is wrong). The screen asks first, keeps the old text in memory, shows the new one in the box, and **Restore previous** is a normal `PUT` built from a fresh copy. The old text is lost when the admin leaves the page. 503 says no language model is configured.
- **CSV.** The first line must be exactly `name,description,price,stock_quantity,category`; a wrong file is refused before anything is sent. The preview is a look, not a validation: the server checks every row and skips bad ones (`skipCount`); the page shows the server's error-file path. A row whose name matches a product **updates** it, and the page says so. The upload is not retried (a lost reply does not mean nothing was imported).
- **Never called:** `POST /api/products/batch` and inventory `reserve`, `release`, `orders/{id}/close` (service to service), and `DELETE /api/inventory/{productId}` (not in the guide).
- **Dead letters are built against the pinned schema.** Backend `main` (KI-040) adds `dltTimestamp`; the pin does not have it. Moving the pin is a separate `chore/pin-backend-<tag>`.

## Screens

Each handles loading, error (with Retry and the support reference for a 5xx), and empty. At 360 px the tables scroll inside their own box. `e2e/screens.ts` has stubbed screens for the matrix: `admin-products`, `admin-product-form`, `admin-stock`, `admin-import`, `admin-dead-letters`.

## Tests

Unit and component: `products.test.tsx` (list, delete with a typed name, create, edit, generate, restore, 503), `operations.test.tsx` (stock, search index), `import.test.tsx`, `saga.test.tsx`, `states.test.tsx` (errors, Retry, empty bodies), `schemas.test.ts`, `csv.test.ts`, `failure.test.ts`. E2E: `e2e/admin.spec.ts` (real backend; runs only when `E2E_ADMIN_USERNAME` and `E2E_ADMIN_PASSWORD` are set), the stubbed screens, and `routes.spec.ts`.
