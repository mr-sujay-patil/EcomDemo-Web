# Module: cart (`src/features/cart/`)

The customer's one cart: the page, the header count, "Add to cart" on the shelf and the product page. Backend: `docs/backend/integration-guide.md`, "Cart". Decisions: `docs/decisions.md` [Phase 12].

## Parts

| File | What it does |
|---|---|
| `cart.ts` | the four calls (`fetchCart`, `addCartItem`, `setCartItemQuantity`, `removeCartItem`); each returns the whole `Cart` |
| `api.ts` | `cartKeys`, `useCart`, `useAddToCart`, `useSetQuantity` (optimistic), `useRemoveItem`, `countItems`, `quantityInCart` |
| `useAddAction.ts` | what the shelf and the product page need: `add`, `inCart`, `canAdd`, `error`, `adding`, `dismiss`; signed out it goes to sign-in |
| `CartPage.tsx`, `cart.css` | `/cart`: lines, summary, Undo, empty and error states |

## Rules

- **The answer replaces the cart.** Every write ends in `setQueryData(cartKeys.all, answer)`. Never patch totals in JS: `lineTotal` and `totalAmount` are the server's.
- **One queue.** All writes share the mutation scope `{ id: 'cart' }`, so they reach the server in the order clicked.
- **Optimistic only for quantity.** The stepper moves at once; money waits for the answer. A refusal restores the snapshot, refetches, and shows the server's message in an `Alert` ("Your cart was not changed").
- **Remove and Undo.** DELETE at once; Undo re-adds (POST) for five seconds. The re-added line has the current catalogue price (see the decision).
- **Price when added.** Each line shows its `unitPrice` with the note "price when added". The backend snapshots at add time; its OpenAPI text says otherwise (web KI-019).
- **Who.** The cart query runs only for a CUSTOMER; the key `['cart']` does not start with `'catalog'`, so signing out removes it.
- **Adding does not check stock.** The real check is at checkout (Phase 13).

## Screens

- `/cart` (CUSTOMER, lazy): loading, error with Retry, empty ("Your cart is empty", Browse the shelf, no checkout button), lines + `OrderSummary` (Checkout goes to `/checkout`; one column below 900 px, summary last).
- Header: the cart link reads "Cart, n items"; the badge is the sum of quantities.
- Shelf card and product page: "Add to cart" becomes "In your cart (n)"; a refused add shows an `Alert`.

## Tests

`CartPage.test.tsx` (guard, totals, price when added, optimistic move, whole-cart replacement, rollback, remove and Undo, Undo expiry, empty, error, checkout), `ProductPage.test.tsx` (sign-in and back, add, refusal, admin), `src/test/msw/cart.ts` (a pretend cart server), `e2e/cart.spec.ts` (real backend: add two, change, remove and undo, totals match; signed-out add returns).
