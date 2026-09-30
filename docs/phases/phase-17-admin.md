# Phase 17: Admin Console

| | |
|---|---|
| **Stage** | Stage 4: Admin |
| **Technology** | Role-gated area + file upload |
| **Branch** | `feature/phase-17-admin` |
| **PR title** | `Phase 17: Admin Console` |
| **Requires** | `phase-16-complete` on `main`; the seeded ADMIN account (credentials from the user's environment) |
| **Needs from the backend** | ADMIN endpoints (guide section 7) |
| **Completion tag** | `phase-17-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** A separate, role-gated admin area for the shop's owner: products, stock, imports, and (optionally) saga support.

**What you'll implement**
- `/admin/*`, lazy-loaded, shown only when the session's role is ADMIN (a CUSTOMER sees "Not permitted"; the gateway's 403 is the real rule). Its own layout: a dense, plain table style from the design system; no marketing look.
- **Products:** list (from `GET /api/products`), create (`POST /api/products`), edit as a full replace (`PUT /api/products/{id}`), delete (`DELETE /api/products/{id}`, 204) with a typed confirmation. `ProductRequest` rules in Zod: `name` up to 255, `description` up to 1000, `price` ≥ 0.01 with at most 2 decimals, `stockQuantity` ≥ 0, `category` up to 50 (optional). A 400 lists every invalid field.
- **Draft description:** `POST /api/products/{id}/generate-description` shows `description`, `tags`, `seoTitle` as a **draft the admin reviews and edits**, never saved automatically; 503 when no LLM is configured.
- **Stock:** `GET /api/inventory?productIds=…` for the list and `PUT /api/inventory/{productId}` to **set** a level (not a delta), with that stated next to the field.
- **Import:** upload a CSV to `POST /api/admin/batch/product-import` (`multipart/form-data`, field `file`; header `name,description,price,stock_quantity,category`), a preview of the first rows and a header check before sending; the request runs to completion, so show progress honestly ("Importing… this waits for the whole file"); then `readCount`, `writeCount`, `skipCount`, `failureMessage` and the `errorFile` path; restart with `POST …/executions/{id}/restart` (409 if it can't).
- **Search index:** start `POST /api/products/embeddings/backfill` (202) and poll `GET …/backfill/{executionId}` every 2 s.
- **Saga support (last, optional):** dead letters (`GET /api/admin/dead-letters`), replay (`POST …/{topic}/{partition}/{offset}/replay`; 409 already replayed, backend KI-040) and the replay audit (`GET …/replays`). If time runs short, record it as a candidate instead.
- Never call the service-to-service endpoints (`POST /api/products/batch`, inventory `reserve`/`release`/`orders/{id}/close`).
- `docs/modules/admin.md`.
- Tests: role gating; ProductRequest validation; the CSV header check; the draft is never saved without an explicit save.

**Concepts to understand**
- Role-gated areas: UI gating versus server authorization
- File upload with `FormData`
- Long-running requests versus polling a job
- Why generated text is a draft a person approves

**Done when**
- Signed in as ADMIN (credentials from `E2E_ADMIN_USERNAME` / `E2E_ADMIN_PASSWORD`): create, edit and delete a product; set a stock level; import a small CSV with one bad row and see `skipCount` 1 (E2E). A CUSTOMER on `/admin` sees "Not permitted".

**Not in this phase:** user management (not in the API).

## E2E additions (`e2e/`)

Admin: create → edit → delete a product; set stock; import a CSV with one bad row (`skipCount` 1). Customer on `/admin` → "Not permitted".

## Your manual steps (user)

Set `E2E_ADMIN_USERNAME` and `E2E_ADMIN_PASSWORD` in your environment (the backend README has the seeded account; change its password if you haven't). Never put them in the repository.
