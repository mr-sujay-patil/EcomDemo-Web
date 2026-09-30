# Phase 12: Cart

| | |
|---|---|
| **Stage** | Stage 3: Shopping |
| **Technology** | Mutations + cache invalidation |
| **Branch** | `feature/phase-12-cart` |
| **PR title** | `Phase 12: Cart` |
| **Requires** | `phase-11-complete` on `main` |
| **Needs from the backend** | cart API |
| **Completion tag** | `phase-12-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** The cart, with the UI always showing what the server holds.

**What you'll implement**
- `src/features/cart/api.ts`: the cart query and mutations (`POST /api/cart/items`, `PUT /api/cart/items/{productId}`, `DELETE /api/cart/items/{productId}`). **Every cart call returns the whole cart**: replace the cached cart with the response instead of patching it.
- Quantity changes are optimistic (the stepper moves at once) and roll back with an `Alert` if the server refuses.
- Add to cart from the product card and page (anonymous users go to sign-in first, then back); the card reads "In your cart (n)"; the header count comes from the cart query.
- **Cart page** as `design-system/patterns.md` describes: `CartLine`s showing the cart's `unitPrice` labelled **"price when added"** (a line keeps the price it was added at), `lineTotal`, and `OrderSummary` with the server's `totalAmount`; remove with a five-second Undo; an empty state with "Browse the shelf". The checkout button is disabled when the cart is empty.
- Adding does **not** check stock (the guide); the product page's stock line stays a hint, and the real check is at checkout (Phase 13).
- Cache rules in `docs/decisions.md`: which mutation updates or invalidates which key. `docs/modules/cart.md`.
- Tests: optimistic change and rollback; undo; the whole-cart replacement; "price when added" shows the cart's price even when the product price differs.

**Concepts to understand**
- Mutations, optimistic updates and rollback
- Cache invalidation versus writing the response into the cache
- Why the server is the only source of totals

**Done when**
- Against the real backend: add two products, change a quantity, remove and undo, and the totals always match the server's (E2E).

**Not in this phase:** checkout (Phase 13), a guest cart (web KI-012, a candidate).

## E2E additions (`e2e/`)

Signed in: add two products → change a quantity → remove + undo → totals match `totalAmount`; anonymous Add to cart goes to sign-in and back.

## Your manual steps (user)

None. Only review, learn, merge, and reply `merged, continue`.
