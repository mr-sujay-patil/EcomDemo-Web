# Routing

React Router 8 (`react-router` 8.4.0), as a **data router**: `src/app/router.tsx` exports the route table (`routes`) and `createAppRouter()`, which `src/main.tsx` hands to `<RouterProvider>` (from `react-router/dom`). Tests render the same table with `createMemoryRouter` (`renderRoute` in `src/test/render.tsx`), so they cannot drift from the app.

## Why a data router, and not `<BrowserRouter>`

A data router owns navigation as state, outside React. Phase 8 and later can hang loaders (prefetching data before a page renders) and actions on routes, and `<ScrollRestoration>` and "the navigation is still loading" both need it. Routes defined now as plain objects can gain a loader later without moving.

## The layout

One pathless layout route (`src/app/Layout.tsx`) wraps every page: a **Skip to content** link, a header (store name, search and cart placeholders), `<main id="main" tabIndex={-1}>` holding the `<Outlet>`, and a footer. Pages render their own `h1` and never their own `<main>`: the layout owns the landmark, so there is exactly one.

The layout also does three things a browser would do on a real page load but does not do on a client-side navigation:

| Job | How |
|---|---|
| Document title | each route sets `handle: { title }`; the layout turns the deepest one into `EcomDemo · <title>` |
| Focus | after a pathname change, focus moves to the new page's `h1` (given `tabindex="-1"`), so a screen reader announces the page; the first render is left alone |
| Scroll | `<ScrollRestoration />`: back and forward restore the position, a new page starts at the top |

The skip link focuses `<main>` itself (the browser scrolls to `#main` on its own, but does not always move focus).

## Route table

| Path | Page (`h1`) | Built in | Why it exists |
|---|---|---|---|
| `/` | Products | Phase 1 (data: 8) | the shelf: where a visitor starts |
| `/products/:id` | Product | 8 | one product: price, stock, add to cart |
| `/search` | Search | 15 | semantic search results; the query lives in the URL |
| `/cart` | Your cart | 12 | what the customer is about to buy |
| `/checkout` | Checkout | 13 | placing the order and watching the saga; **lazy** |
| `/orders` | Your orders | 14 | the customer's order history |
| `/orders/:id` | Order | 13, 14 | one order and its status |
| `/account` | Your account | 14 | profile |
| `/sign-in` | Sign in | 10 (form), 11 (session) | the sign-in form; keeping the token and guards are Phase 11 |
| `/register` | Create an account | 10 | registration form, then on to `/sign-in` |
| `/admin/*` | Admin | 17 | the console; **lazy**; sub-routes arrive with the phase |
| `/about`, `/returns`, `/shipping`, `/privacy`, `/terms` | their names | 6 (structure), owner (words) | the human surfaces a store needs from day one; every paragraph is a `TODO(owner)` |
| `*` | Page not found | 6 | any other address; links back to `/` |

Placeholders show their final `h1` and one line naming the phase that builds them (`PlaceholderPage`). The assistant (Phase 16) is a widget on every page, not a route, so it has no row here; it will be loaded with `lazy` import the same way when it exists.

## Code splitting

`/checkout` and `/admin/*` use the route's `lazy` property: the page's module is a separate file (`CheckoutPage-*.js`, `AdminPage-*.js` in `dist/assets/`), downloaded only when the route is opened. `e2e/routes.spec.ts` proves the home page requests neither. If a lazy route is the *first* page a visitor loads, the router shows `HydrateFallback` ("Loading…") until the chunk arrives; without it the router warns in development.

## Deep links need an SPA fallback

`/cart` is a URL the *browser* can request from the server, not just a client-side state. Vite's dev and preview servers answer every unknown path with `index.html`. The production image must too: nginx `try_files … /index.html` (Phase 19). Without it a reload on `/cart` would be a 404 from the server.

## The owner's content

`src/content/site.ts` holds the store's operator, contact email and ship-from city, shown in the footer. Everything is a visible `TODO(owner): …` until the owner replaces it.
