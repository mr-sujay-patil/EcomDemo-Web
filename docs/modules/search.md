# Module: search (`src/features/search/`)

Finding a product by what it is for. The header box suggests as you type; `/search` shows the results. Backend: `docs/backend/integration-guide.md`, "Catalogue" (`GET /api/products/search`). Decisions: `docs/decisions.md` [Phase 15].

## Parts

| File | What it does |
|---|---|
| `search.ts` | the call (`searchProducts`), the URL state (`parseSearch`, `toSearchParams`), and the word-matching fallback (`filterCatalogue`) |
| `api.ts` | `useSearchResults` (the page, limit 20), `useSuggestions` (the header, limit 5), `isSearchUnavailable` (a 503) |
| `useDebouncedValue.ts` | a value that settles after it stops changing for N ms |
| `SearchBox.tsx` | the header's combobox: debounced suggestions, arrow keys, Enter, Escape |
| `SearchPage.tsx` | `/search`: the filter form, the results, the fallback |

## Rules

- **The URL is the state.** `/search?q=…&category=…&minPrice=…&maxPrice=…`. Only what is set is written. A link, a reload or Back brings the same search; the header box follows the URL. A bad value in a link (negative price, a query over 200 characters) is dropped or cut, never an error. The page has no `limit` in the URL: it always asks for 20, the most the endpoint gives.
- **Debounce, not throttle.** The box waits 300 ms after the last keystroke (`SUGGESTION_DELAY_MS`); fast typing sends one request. Nothing is asked for below two characters. A box prefilled from the URL asks for nothing until the person types.
- **The server's order is the ranking.** Results are shown as returned, "best match first". `similarity` is never shown or sorted on.
- **Stale answers cannot win.** The query key holds the query and filters, and the query function passes TanStack's `signal` to the fetch. A new key aborts the request in flight, so a slow old answer never lands on a newer search.
- **503 means search by description is off** (no embedding model, or it did not answer). The page shows an `info` `Alert` in customer words and filters the loaded catalogue instead: every word of the query must be in the name or description, then the category and price filters apply, in the catalogue's order. The caption says which was used ("best match first" or "matched on words in the name and description"). The header box shows no suggestions and no error in that case. The word "503" is never in the UI.
- **Other failures** show the `ErrorPanel` (message, correlation id on a 5xx, Retry).
- **Categories** in the filter come from the loaded catalogue, without "Other" (the shelf's name for no category; the backend has none to filter by). A category in a link that the catalogue lacks is kept in the list.
- **A price range the wrong way round** (lowest above highest) is refused on the field and the URL is not changed.
- **Not here.** Search analytics; paging beyond 20; a `limit` control.

## Tests

`search.test.ts` (URL round trip, cuts and drops, the fallback filter), `useDebouncedValue.test.tsx` (fake timers), `SearchBox.test.tsx` (one request for a burst, minimum length, order and prices, arrow keys, Enter, Escape, 503 shows nothing, follows the URL), `SearchPage.test.tsx` (order kept, filters to the backend, form from the URL, Apply, 503 fallback, stale request aborted and ignored), `api.test.ts`; `e2e/search.spec.ts` (real backend result or fallback, URL round trip, forced 503, no request per keystroke, keyboard through suggestions); `e2e/screens.ts` (`search-results`, `search-fallback`, `search-suggestions` for the matrix and screenshots).
