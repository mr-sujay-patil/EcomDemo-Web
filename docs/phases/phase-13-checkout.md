# Phase 13: Checkout and Order Tracking

| | |
|---|---|
| **Stage** | Stage 3: Shopping |
| **Technology** | Polling a saga (status state machine) |
| **Branch** | `feature/phase-13-checkout` |
| **PR title** | `Phase 13: Checkout and Order Tracking` |
| **Requires** | `phase-12-complete` on `main`; backend saga deadline at the pinned tag |
| **Needs from the backend** | orders API; saga deadline |
| **Completion tag** | `phase-13-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** Checkout that tells the truth: `201` means "order received", not "order confirmed".

**What you'll implement**
- Place order: `POST /api/orders` (the button in loading; **never retried automatically**: a lost response doesn't mean no order, so on a network error re-read `GET /api/orders` first and show what's there). One click, no address step (web KI-008).
- **409 up front** ("Insufficient stock for 'Mouse': requested 3, available 2", or the empty cart): stay on the cart, show the message next to the line, offer to lower the quantity; the cart is kept.
- On 201 → `/orders/:id`: `SagaTimeline` driven by polling `GET /api/orders/{id}/status` every 1-2 s (never faster); after about 15 s "Taking longer than usual"; keep polling (the backend's saga deadline settles it); stop at about 90 s with a link to My orders. Polling pauses when the tab is hidden and stops at CONFIRMED or CANCELLED.
- CONFIRMED: the confirmation, plus a `StaffNote` from `src/content/notes.ts` (`TODO(owner)`; not rendered until written). No confetti.
- CANCELLED: the `reason` (stock taken a moment later, or "Payment declined: … exceeds the limit of 10000.00") and **"Add these items to my cart again"** from the order's `items` (the cart is not restored: web KI-007).
- The status flow as an explicit state machine (`placing → pending → slow → confirmed | cancelled | gaveUp`) in `src/features/checkout/orderStatus.ts`, unit-tested on its own. `docs/modules/checkout.md`.
- Tests: the state machine (fake timers: 1-2 s interval, 15 s, 90 s); no automatic retry of the POST; 409 shown by the line; add-again re-adds lines.

**Concepts to understand**
- Eventual consistency in a UI: PENDING shown honestly
- Polling with back-off and stop conditions; why not faster than 1-2 s (rate limits)
- Idempotency and why checkout is never retried
- State machines for UI flows

**Done when**
- Against the real backend: a purchase reaches CONFIRMED; an order above ₹10,000 ends CANCELLED with the reason and its items can be added back; a quantity above stock is refused up front with the message by the line (E2E).

**Not in this phase:** order history (Phase 14), push updates (web KI-013).

## E2E additions (`e2e/`)

Checkout → CONFIRMED; an order over 10 000.00 → CANCELLED with the reason → add again; quantity above stock → 409 by the line, cart kept; empty cart → checkout disabled.

## Your manual steps (user)

Write the order-confirmed note in `src/content/notes.ts` when you're ready.
