# Module: checkout (`src/features/checkout/`)

Placing the order and following it until it is settled. The button is on the cart page (`docs/modules/cart.md`); the order page is here. Backend: `docs/backend/integration-guide.md`, "Orders" and "Checkout behaviour". Decisions: `docs/decisions.md` [Phase 13].

## Parts

| File | What it does |
|---|---|
| `orders.ts` | the four calls: `placeOrder`, `fetchOrders`, `fetchOrder`, `fetchOrderStatus` |
| `api.ts` | `orderKeys`, `usePlaceOrder` (never retried; recovers from a lost answer), `useOrder`, `useOrderStatus` (polls while the phase says to) |
| `orderStatus.ts` | the state machine: `nextPhase`, `isPolling`, `POLL_MS` 1.5 s, `SLOW_AFTER_MS` 15 s, `GIVE_UP_AFTER_MS` 90 s |
| `stockRefusal.ts` | reads the 409 message so the cart page can put it by the line |
| `OrderPage.tsx`, `checkout.css` | `/orders/:id` (lazy): timeline, outcome, read-only lines |
| `src/content/notes.ts` | the owner's confirmation note (`null` until written) |

## The flow

`201` is "order received", never "confirmed". The page starts at `pending`, asks `GET /api/orders/{id}/status` every 1.5 s, says "Taking longer than usual" after 15 s, keeps asking, and after 90 s says "We stopped checking" with a link to My orders (the server's own deadline settles the order). Polling stops at CONFIRMED or CANCELLED and pauses in a hidden tab. Each state:

- **pending / slow:** "Placing your order…" (a `role="status"` line), `SagaTimeline` at stock reserved.
- **confirmed:** "Your order is confirmed.", the owner's `StaffNote` only if written (`orderConfirmedNote`), no celebration.
- **cancelled:** a `danger` Alert with the server's `reason`; "Add these items to my cart again" (items one by one, then the cart) and "Back to cart". The cart is not restored by the backend (web KI-007). A reason starting "Payment declined" marks the payment step as failed, anything else the stock step.
- **gaveUp:** an info Alert; the order is not cancelled, only the checking stopped.

## Placing it (on the cart page)

- One click, no address (web KI-008); the button is `loading` while the request is on the way.
- **Never retried.** A lost answer (status 0): the cart and the orders are read. Empty cart plus an order on the account means it was made, and that order opens; a cart that still has its lines means nothing was placed: the error shows and the cart is kept.
- **409 up front:** "Insufficient stock for 'X': requested n, available m" is shown under line X with "Lower to m" (none when m is 0). Any other refusal is an Alert on top. The cart is kept in every case.
- On success the cart and orders caches are invalidated (the server emptied the cart; the app asks, it does not guess).

## Keys

`['orders', 'detail', id]` (seeded by the 201 so the page opens with its lines), `['orders', 'status', id]`, `['orders', 'list']`. None starts with `'catalog'`, so signing out drops them.

## Tests

`orderStatus.test.ts` (every transition, the finals, wrong-phase timers), `checkout.test.tsx` (place and confirm; the cart asked again; polling no faster than 1 s nor slower than 2 s; 15 s and 90 s with fake timers; polling stops when settled; cancelled with reason and add again, with a failed add; the 409 by the line, with and without room to lower; another refusal on top; a lost answer in both cases with exactly one POST; settled order at once; not found, not permitted, load error, a failed poll; `/checkout` redirect), `src/test/msw/orders.ts` (a pretend order server), `e2e/checkout.spec.ts` (real backend: confirmed; over 10 000 cancelled and added again; 409 by the line; empty cart).
