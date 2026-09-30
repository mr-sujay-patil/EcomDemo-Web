# Phase 8: Server State

| | |
|---|---|
| **Stage** | Stage 2: Application Shell |
| **Technology** | TanStack Query |
| **Branch** | `feature/phase-08-server-state` |
| **PR title** | `Phase 08: Server State` |
| **Requires** | `phase-07-complete` on `main` |
| **Needs from the backend** | none |
| **Completion tag** | `phase-08-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** Server data is cached, shared and refreshed in one place, and the catalogue gets its real behaviour: filter, sort, paginate and a product page.

**What you'll implement**
- TanStack Query (latest stable): a `QueryClient` in `src/app/providers.tsx`, with defaults recorded in `docs/decisions.md` (stale time for the catalogue, retries delegated to Phase 7's policy, no refetch on focus for the catalogue).
- Query hooks with a key factory in `src/features/catalog/api.ts`: `catalogKeys.list()`, `catalogKeys.detail(id)`.
- Catalogue page: loads `GET /api/products` once and, **client-side** (web KI-003, KI-004), filters by category (the list derived from the products; `null` = "Other"), sorts (name, price), and paginates (24 per page). Filter, sort and page live in the URL (`?category=AUDIO&sort=price&page=2`) so they survive reload and can be shared.
- Product page (`/products/:id`): name, category, price, description, and `stockQuantity` as a display hint ("18 in stock", "Only 3 left", "Out of stock"); **404 → "No longer available"** with a link back. The Add to cart button is present and disabled ("Sign in to add to your cart"), enabled in Phase 12.
- Prefetch a product on card hover or focus.
- Loading states reserve their space and say what is loading; no shimmer. Error states: `ApiError.message` or the correlation id, plus Retry.
- Tests with MSW: filter and sort update the URL and the list; pagination; 404 page; error and retry.
- `docs/modules/catalog.md`.

**Concepts to understand**
- Server state versus client state
- Query keys, caching, stale time, garbage collection
- URL as state
- Prefetching and perceived performance

**Done when**
- Against the real backend: the shelf shows the seeded products, filters, sort and pages work and survive reload, and a product page opens by link and by deep URL.

**Not in this phase:** styling (Phase 9), search (Phase 15), the cart (Phase 12).

## E2E additions (`e2e/`)

Filter by category → URL updates → reload keeps it; sort by price; next page; open a product; an unknown id shows "No longer available".

## Your manual steps (user)

None. Only review, learn, merge, and reply `merged, continue`.
