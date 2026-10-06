# State

The app keeps three kinds of state, in three places, and never mixes them.

| Kind | Example | Where it lives |
|---|---|---|
| **Server state**: data the backend owns, which this app only holds a copy of | the product list, one product | the TanStack Query cache (`@tanstack/react-query` 5.104.0) |
| **URL state**: what the user is looking at, which should survive a reload and be shareable | the shelf's category, sort and page | the address bar (`useSearchParams`) |
| **Client state**: things only this browser tab knows | a form's unsent text, the session token | component state; the session in `src/features/auth/session.ts` (memory only, `useSession`); unsent text that must outlive a session in `useFormDraft` |

Server state is not component state. A copy fetched in `useEffect` has no owner: two components that need the same product fetch it twice, a retry is hand-written each time, and nothing says when the copy is too old. The cache gives every copy a key, an age and an owner.

## The cache

`createQueryClient()` and `AppProviders` are in `src/app/providers.tsx`; `src/main.tsx` wraps the router in them, and `renderRoute` in tests gives every render its own cache.

| Setting | Value | Why |
|---|---|---|
| `retry` | `false` (app-wide) | the API client already retries what is safe, once, in `src/api/retry.ts`; a second layer would turn one failure into four requests |
| `staleTime` | 0 (TanStack's default) app-wide; **5 minutes** for the catalogue | data is "stale" once older than this; a stale entry is shown at once and refetched in the background when someone asks for it again. The catalogue changes when an admin edits it, so the shelf and a product page share one fresh copy |
| `refetchOnWindowFocus` | on app-wide (the default); **off** for the catalogue | data that changes under the user (the cart, an order's status) should refresh when they come back to the tab; the catalogue should not flicker |
| `gcTime` | 5 minutes (the default) | an entry nobody is using is thrown away this long after the last component unmounts |
| error type | `ApiError` (`declare module` in `providers.tsx`) | every failed query's `error` is typed as the one error the API client produces |

## Keys

`catalogKeys` (`src/features/catalog/api.ts`) is the only place keys are written:

```
['catalog']                      all of the catalogue   (invalidate this to refetch everything)
['catalog', 'list']              GET /api/products
['catalog', 'detail', 12]        GET /api/products/12
```

A key is the cache's address. Two components that ask for `catalogKeys.detail(12)` share one request and one answer. A mutation (the cart, Phase 12) names the keys it makes stale with `invalidateQueries`; the hierarchy lets it name a branch.

## Prefetching

Hovering or focusing a product card on the shelf calls `queryClient.prefetchQuery(productQuery(id))`. By the time the click lands, the answer is usually in the cache and the product page paints with no loading state. A fresh entry is not fetched again, so hovering twice costs nothing.

## The shelf, and the URL as state

The backend returns the whole catalogue, unsorted and unpaginated (web KI-003), with no category list (KI-004). So the shelf fetches `GET /api/products` once and filters, sorts and pages that list in the browser (`src/features/catalog/shelf.ts`, plain functions with unit tests):

- `?category=AUDIO&sort=price&page=2`: category (the list is derived from the products; no category or a blank one is "Other"), sort (`name` is the default and is left out of the URL; `price`, `price-desc`), page (24 to a page, 1-based, left out when 1).
- Anything unreadable in the URL falls back to the default; a page past the end shows the last page; a category nothing is in says "No products match" and keeps the filter visible, so a stale shared link is not mistaken for the whole shelf.
- Changing the filter or sort returns to page 1. Every change is a history entry, so Back undoes it.
- The URL is the single source of truth: the selects are controlled by it, and there is no copy of "the current page" in component state to fall out of step.

## Loading and error states

A loading state says what is loading (`role="status"`) and sits in a box that keeps its height, so the footer does not jump when the data arrives (an inline `min-height` until Phase 9's tokens). An error state (`src/components/ErrorPanel.tsx`) shows `ApiError.message`, the correlation id when the cause is the server (5xx) or the network (status 0), and a Retry button that calls `refetch()`. There is no shimmer.

## The session and the cache (Phase 11)

The signed-in person's data lives in the query cache like any server state, and is **removed whenever a session ends** (sign-out, expiry, a refused token): every query whose key does not start with `'catalog'`. So a new feature's keys are safe by default, and a catalogue key must start with `catalog` to survive (`catalogKeys` does). The session itself is not in the cache: it is a small external store (`docs/architecture/auth-flow.md`).
