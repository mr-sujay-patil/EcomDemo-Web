# Module: catalog (`src/features/catalog/`)

The shelf and the product page. Concepts (cache, keys, URL state): `docs/architecture/state.md`. API: `docs/backend/integration-guide.md` ("Catalogue"); the types are generated (`src/api/generated/catalog.ts`).

## Screens and routes

| Route | Component | What it shows |
|---|---|---|
| `/` | `ProductListPage` | the shelf, 'Everything for the desk': a row of category `Chip`s (with counts), a sort `<select>`, `ProductCard`s (photo or well, category, name, description, price, stock), 24 a page, a pager, a count that is announced (`aria-live`) |
| `/products/:id` | `ProductPage` | photo or well (7 of 12 columns), category, name, price, a stock hint, description, a disabled Add to cart (enabled in Phase 12), a way back |

## API calls

| Call | Query key | Notes |
|---|---|---|
| `GET /api/products` | `catalogKeys.list()` | once; filter, sort and paging are client-side (web KI-003, KI-004) |
| `GET /api/products/{id}` | `catalogKeys.detail(id)` | `404` shows "No longer available" |

Both are fresh for 5 minutes and do not refetch on window focus. `usePrefetchProduct` warms a product on card hover or focus.

## Files

`products.ts` (the two fetchers), `api.ts` (keys, query options, hooks), `shelf.ts` (parse and write the URL, filter, sort, page, `stockHint`), the two pages. `src/lib/money.ts` formats prices (`en-IN`, INR); prices are the server's numbers, never summed or rounded here.

## Images

A product's `imageUrl` is a path on this origin (`/api/products/1/image`) or `null` (backend `phase-34-complete`, `docs/backend/phase-34-delta.md`). The page hands it to `ProductCard` / `ProductTile`, which show the photo and fall back to the "Photo to come" well for `null` or a failed load. The shelf never builds an image URL itself. The cards are built from the design system (`docs/architecture/design-system.md`); the name is a router link that covers the whole card, and the card has no Add to cart button until Phase 12.

## Edge cases handled

- No products: "No products yet." A filter nothing matches: "No products match." with a link to the whole shelf.
- A product with no category (or a blank one) is in "Other".
- An unreadable `?sort=`, `?page=` is ignored; a page past the end shows the last page; a shared link to a category that no longer exists keeps the filter visible.
- `/products/abc`, `/products/0`, `/products/1.5` are "No longer available" without asking the server.
- Stock hint: 0 or less "Out of stock"; 1 to 5 "Only N left"; more "N in stock". It is a hint: checkout re-checks (guide, "Errors").
- Categories are shown in words (`AUDIO` is "Audio") but filtered and kept in the URL as the catalogue stores them (`?category=AUDIO`).
- 4xx errors show the message; 5xx and network errors also show the correlation id; both offer Retry.

## Tests

`shelf.test.ts` (URL parsing, round trip, categories, filter, both sorts and their ties, pages, clamping, stock hints), `ProductListPage.test.tsx` (loading, formatting, errors and retry, filter and sort in the URL, back button, pagination, prefetch on hover and focus), `ProductPage.test.tsx`, and in `e2e/`: `shelf.spec.ts` and `catalog.spec.ts`.
