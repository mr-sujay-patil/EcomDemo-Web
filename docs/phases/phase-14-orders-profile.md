# Phase 14: Orders and Profile

| | |
|---|---|
| **Stage** | Stage 3: Shopping |
| **Technology** | Nested routes + detail views |
| **Branch** | `feature/phase-14-orders-profile` |
| **PR title** | `Phase 14: Orders and Profile` |
| **Requires** | `phase-13-complete` on `main` |
| **Needs from the backend** | no password change (backend KI-018) |
| **Completion tag** | `phase-14-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** Customers can see what they bought and manage their profile.

**What you'll implement**
- **My orders** (`/orders`): a table (not cards) from `GET /api/orders`: order id, `placedAt` in the user's time zone, item count, `totalAmount`, `StatusBadge` (with `statusReason` for CANCELLED); newest first; client-side paging.
- **Order detail** (`/orders/:id`) as a nested route with the list: `GET /api/orders/{id}`, its lines with `unitPrice` and `lineTotal`, the timeline (reusing Phase 13 for a PENDING order). Another customer's order (**403**) and an unknown one (404) both show "Order not found"; never the reason.
- **Profile** (`/account`): `GET /api/customers/me` (username, full name, member since `createdAt`); edit **the full name only** with `PUT /api/customers/me` using the form kit. No password change (web KI-006): say so plainly.
- `docs/modules/orders.md`, `docs/modules/account.md`.
- Tests: list ordering and paging; 403/404 both "Order not found"; profile edit and its field errors.

**Concepts to understand**
- Nested routes and layouts for list-detail screens
- Formatting ISO-8601 UTC timestamps in the user's time zone
- Not leaking information through error messages (403 vs 404)

**Done when**
- A customer sees their orders and details, can't see another customer's (E2E with two users), and can change their full name.

**Not in this phase:** order cancellation by the shopper (not supported by the backend: web KI-008).

## E2E additions (`e2e/`)

My orders lists the orders placed earlier in the suite; a detail opens; a second user's order id shows "Order not found"; edit the full name.

## Your manual steps (user)

None. Only review, learn, merge, and reply `merged, continue`.
