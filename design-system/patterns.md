# Page patterns

How the components compose into the store's screens. Each one maps to an API the backend already has. None of them is a marketing template: there is no hero-plus-three-cards page, no bento grid, no testimonial carousel, no pricing table.

## Catalogue (`GET /api/products`, `GET /api/products/search`)

`Header`, then straight into the shelf: a `heading` "Everything for the desk" left-aligned, a row of category `Chip`s ("Everything" selected), then `ProductCard`s. Four columns from 1200px, three from 900px, two from 600px, one below, `space-4` gutter. No banner above the products: the products are the page. Once, after the first two rows, a full-width `surface-alt` band with a single `StaffNote` about what's new this month breaks the grid. When search by description is unavailable, show an `info` `Alert` and fall back to name search.

## Product (`GET /api/products/{id}`)

Two columns: the photo (or its "Photo to come" well) on the left, 7 of 12 columns; name, overline, price, stock, quantity and Add to cart on the right. Under the description, at most one `StaffNote` explaining why the store stocks it. Specs as a plain two-column list in mono, not cards.

## Cart (`/api/cart`)

`CartLine`s on the left under a `heading` "Your cart", `OrderSummary` on the right, sticky `space-6` from the top; one column on mobile, summary last. Removing a line shows a `success` `Alert` with an Undo `ghost` button for five seconds. Empty cart: one `title` line ("Your cart is empty"), one `caption`, one `secondary` Button "Browse the shelf".

## Checkout → order (`POST /api/orders`, then the order's status)

Place order puts the button into `loading`, then the page becomes the order: a `heading` "Order #1042", its `SagaTimeline`, and the lines as read-only rows. While PENDING, check the status every couple of seconds; the tick boxes fill on their own. On CONFIRMED, a `StaffNote` from the owner replaces any celebration: no confetti, no animated checkmark. On CANCELLED, a `danger` `Alert` with the reason and a `primary` "Back to cart" (the cart is kept).

## Orders (`GET /api/orders`)

A table, not cards: order ID in mono, date, item count, total in mono right-aligned, `StatusBadge`. Rows open the order. Newest first.

## Assistant (`POST /api/assistant/chat`)

A sheet from the right, 400px, `radius-lg` on the leading corners, `shadow-pop`, opened by a `secondary` Button with the `chat` icon labelled "Ask the shop". Messages are `AssistantMessage`s; the input is a `TextField` with a `primary` "Send". A proposal's Add it calls the cart API only on the customer's click.

## The human surfaces (every store needs these; generated sites skip them)

- **Footer:** who runs the store (a name, not "our team"), a real contact email, the city orders ship from, and links to Returns, Shipping, Privacy and Terms. Small, left-aligned, `caption` size, on `surface-alt`.
- **About:** one page, first person, with a real photo of the desk or workspace and the date it was last updated.
- **Returns and shipping:** written by the owner in plain sentences with real numbers (days, costs), not generated policy boilerplate.
- **Order emails:** plain layout with the logo, the order as a receipt in mono, and a signed line at the end.
- **Dates:** notes, policies and the About page show when they were written. A store that is visibly maintained reads as human.
