# Module: cart (`src/features/cart/`)

The customer's one cart: the page, the header count, "Add to cart" on the shelf and the product page, and (Phase 24) the guest cart a visitor fills before signing in. Backend: `docs/backend/integration-guide.md`, "Cart". Decisions: `docs/decisions.md` [Phase 12] and [Phase 24].

## Parts

| File | What it does |
|---|---|
| `cart.ts` | the four calls (`fetchCart`, `addCartItem`, `setCartItemQuantity`, `removeCartItem`); each returns the whole `Cart` |
| `api.ts` | `cartKeys`, `useCart`, `useAddToCart`, `useSetQuantity` (optimistic), `useRemoveItem`, `countItems`, `quantityInCart` |
| `useAddAction.ts` | what the shelf, the product page and search need: `add`, `inCart`, `canAdd`, `error`, `adding`, `dismiss`; signed out it adds to the guest cart |
| `CartRoute.tsx` | `/cart` (lazy): `CartPage` for a customer, `GuestCartPage` for a visitor, sign-in after an ended session, "Not permitted" for an admin |
| `guestCart.ts` | the guest cart's lines (`{ productId, quantity, sent? }`), the key `ecomdemo-guest-cart-v1`, `parseGuestCart` (validation), and pure changes (`addLine`, `setLineQuantity`, `removeLine`, `markSent`, `takeLine`) |
| `guestCartStore.ts` | `createGuestCartStore`: the lines in `localStorage` (memory when it is unavailable), validated on every read, the `storage` event from other tabs |
| `guestReplay.ts` | `replayGuestCart` (read the account's cart, then one POST per line, mark before sending, the unknown-outcome check), `withReplayLock`, `isPermanent` |
| `GuestCartProvider.tsx`, `useGuestCart.ts` | one store for the app (in `AppProviders`); runs the replay when a CUSTOMER session starts; the report (`replay`, `retry`, `dismiss`) |
| `GuestCartPage.tsx` | `/cart` signed out: lines with the current catalogue price by id, stock hint, gone product, Remove and Undo, "Sign in to check out"; no totals |
| `GuestCartNotice.tsx` | under the header: "Moving…", then what moved and what did not, Try again |
| `CartPage.tsx`, `cart.css` | `/cart`: lines, summary, Undo, empty and error states |

## Rules

- **The answer replaces the cart.** Every write ends in `setQueryData(cartKeys.all, answer)`. Never patch totals in JS: `lineTotal` and `totalAmount` are the server's.
- **One queue.** All writes share the mutation scope `{ id: 'cart' }`, so they reach the server in the order clicked.
- **Optimistic only for quantity.** The stepper moves at once; money waits for the answer. A refusal restores the snapshot, refetches, and shows the server's message in an `Alert` ("Your cart was not changed").
- **Remove and Undo.** DELETE at once; Undo re-adds (POST) for five seconds. The re-added line has the current catalogue price (see the decision).
- **Price when added.** Each line shows its `unitPrice` with the note "price when added". The backend snapshots at add time; its OpenAPI text says otherwise (web KI-019).
- **Who.** The cart query runs only for a CUSTOMER; the key `['cart']` does not start with `'catalog'`, so signing out removes it.
- **Adding does not check stock.** The real check is at checkout (Phase 13).

## The guest cart (Phase 24)

- **What the browser keeps:** `{"items":[{"productId":12,"quantity":2}]}` under `ecomdemo-guest-cart-v1`. Never a price, a name, a total or the token. At most 50 lines and 99 of one product. A value that is not exactly this shape is removed without a word; a future format gets a new key.
- **Signed out:** Add to cart adds one (shelf, product page, search); the header counts the guest cart; `/cart` shows it. Prices are the catalogue's current ones ("current price"); there are no line totals and no cart total, because those would be sums made in the browser.
- **Signing in as a customer** replays it: `GET /api/cart`, then one `POST /api/cart/items` per line in order, under the Web Lock `ecomdemo-guest-cart-replay`, through the cart's mutation queue. A line leaves storage when the server has it. A merge adds to what the account has (the API's rule).
- **Partial failure:** a `404` or `400` drops the line ("no longer in the shop"); anything else (no answer, a 5xx, a 429, a 401) stops the run and keeps that line and the rest, with Try again.
- **An unknown outcome is checked, never blindly resent** (web KI-037): before a POST the line records `sent: { over, quantity }` (what the account held, what was sent). On the next run, if the account holds at least `over + quantity`, the earlier POST arrived and the line is taken out without sending it again.
- **Tabs:** the `storage` event keeps every tab's count and page current; the lock stops two tabs signed in at once from both replaying.
- **Sign-out, expiry, a refused token:** the guest cart is left as it is (empty after a replay); the account's cart is never copied into the browser; the replay's report goes with the session. An admin's sign-in replays nothing.

## Screens

- `/cart` signed out (Phase 24): the guest cart page: loading, error with Retry, empty ("stay in this browser until you sign in"), lines with current prices, stock hint ("Only n left.", "Out of stock right now."), "This item is no longer in the shop." with Remove it, Undo, and a "Ready to check out?" panel with Sign in to check out.
- `/cart` (CUSTOMER, lazy): loading, error with Retry, empty ("Your cart is empty", Browse the shelf, no checkout button), lines + `OrderSummary` (Checkout goes to `/checkout`; one column below 900 px, summary last).
- Header: the cart link reads "Cart, n items"; the badge is the sum of quantities (the guest cart's when signed out).
- Under the header after a sign-in with a guest cart: "Your cart is up to date" (View cart), or "Some items did not move to your cart" with one line each and Try again.
- Shelf card and product page: "Add to cart" becomes "In your cart (n)"; a refused add shows an `Alert`.

## Tests

`CartPage.test.tsx` (guard, totals, price when added, optimistic move, whole-cart replacement, rollback, remove and Undo, Undo expiry, empty, error, checkout), `ProductPage.test.tsx` (sign-in and back, add, refusal, admin), `src/test/msw/cart.ts` (a pretend cart server), `e2e/cart.spec.ts` (real backend: add two, change, remove and undo, totals match; a signed-out add stays and moves on sign-in). Phase 24: `guestCart.test.ts` (validation, changes), `guestCartStore.test.ts` (storage, reload, corrupt data, other tabs, no storage), `guestReplay.test.ts` (order, merge, gone product, stop and keep, the lost answer not doubled, the lock), `GuestCartPage.test.tsx` (states, no totals, stock, gone product, Undo, other tab, who sees which cart), `GuestCartReplay.test.tsx` (sign-in moves it, the notice, Try again, lost answer, lock refused, another tab first, admin, sign-out mid-way); `e2e/guest-cart.spec.ts` (add, reload, sign in to check out, the account's cart through the API; merge) and the `cart-guest` screen in `e2e/screens.ts`.
