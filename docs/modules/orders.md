# Module: orders (`src/features/orders/`, with `src/features/checkout/`)

What a customer bought: the list at `/orders` and an order's page at `/orders/:id`. Backend: `docs/backend/integration-guide.md`, "Orders". Decisions: `docs/decisions.md` [Phase 14]. Placing an order and following its saga is `docs/modules/checkout.md`.

## Parts

| File | What it does |
|---|---|
| `orders/OrdersPage.tsx`, `orders.css` | `/orders`: a table (order id, placed, items, total, `StatusBadge` with the reason for CANCELLED), newest first, ten rows a page |
| `checkout/OrderPage.tsx` | `/orders/:id`: the same page that follows a new order; a settled order opens at once as confirmed or cancelled |
| `checkout/orders.ts`, `checkout/api.ts` | the calls (`fetchOrders`, `fetchOrder`, `fetchOrderStatus`) and `orderKeys` |

## Rules

- **Nested routes.** `orders` has two children: the index is the list, `:id` is the order. The list and the order share one path prefix, so "My orders" is a real parent for the back link and the title.
- **Newest first, in the browser.** The server's order is not relied on: sort by `placedAt`, then by `id` (a tie in the same second). The sort copies the array.
- **Paging is client-side.** `GET /api/orders` returns every order; the page slices it. The page number is clamped, so a refetch that shrinks the list never shows an empty page. No pager for one page.
- **Items means pieces.** Three kettles on one line are 3 items.
- **Times** come as ISO-8601 UTC and are shown in the browser's time zone (`Intl.DateTimeFormat('en-IN')`). Money is the server's `totalAmount` through `formatPrice`; never summed here.
- **403 and 404 read the same.** Another customer's order (403) and an unknown or malformed id (404) both show "Order not found"; the server's reason is never shown, so the page does not confirm that an id exists.
- **Not here.** Cancelling an order by the shopper (web KI-008); a status filter or search.

## Screens

- `/orders` (CUSTOMER, lazy): loading, error with Retry, empty ("You have not placed an order yet", Browse the shelf), table. At 360 px the table scrolls inside its own box; the page does not.
- `/orders/:id`: see checkout.md; plus the "Order not found" page with a link to My orders.

## Tests

`OrdersPage.test.tsx` (ordering and ties, columns and the reason, open an order, paging, no pager, empty, error), `checkout.test.tsx` (403 and 404 both "Order not found"), `e2e/orders.spec.ts` (list and detail after a real order, a second user gets "Order not found" for the first one's id and for an unknown id, empty state), `e2e/screens.ts` (a stubbed list of three orders for the layout matrix and screenshots).
