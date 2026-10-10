# Phase 24: Guest Cart

| | |
|---|---|
| **Stage** | Stage 3: Shopping (added after Stage 5, from candidate web KI-012) |
| **Technology** | Browser storage (`localStorage`, versioned and validated) + replay after sign-in |
| **Branch** | `feature/phase-24-guest-cart` |
| **PR title** | `Phase 24: Guest Cart` |
| **Requires** | `phase-23-complete` on `main` (and the fixes after it verified); backend: **none** beyond the cart API already pinned |
| **Needs from the backend** | none: `POST /api/cart/items` (adds to an existing line, `404` for an unknown product) and `GET /api/products/{id}` at the pinned commit are enough (checked against `api/openapi/app.json` and `catalog.json`) |
| **Completion tag** | `phase-24-complete` |

> Approved by the user on 2026-10-10: "Guest cart (KI-012): a signed-out visitor can fill a cart kept in the browser; on sign-in it is replayed into the server cart with POST /api/cart/items. Frontend-only (the backend needs no change), with unit and e2e tests."

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md` ("There is no server-side guest cart … keep it in the browser and replay it with `POST /api/cart/items` right after login"); UI work follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** Someone who has not signed in can fill a cart as they browse. It stays in this browser (a reload keeps it), and when they sign in it moves into their account's cart, line by line, with a plain report of anything that could not be moved.

**What you'll implement**
- A guest cart store: product id and quantity only (never a price, a name or the token) in `localStorage` under a versioned key, validated on every read (anything malformed is discarded), with an in-memory fallback when storage is unavailable, and kept in step across tabs with the `storage` event.
- Signed out, "Add to cart" on the shelf, a product page and the search results adds to the guest cart ("In your cart (n)"), and the header's cart count is the guest cart's.
- `/cart` signed out shows the guest cart: each line with the catalogue's current price fetched by id (labelled as the current price), quantity and remove (with Undo), loading, empty and error states, a line for a product no longer in the shop, a stock hint, no totals worked out in the browser, and "Sign in to check out". A session that ended on the person (expired or refused) still goes to sign-in from `/cart`; an admin still sees "Not permitted".
- Replay on sign-in as a customer: the account's cart is read first, then one `POST /api/cart/items` per line, in order, one tab at a time (Web Locks where available); a line leaves the browser only once the server has it; a product the shop no longer has is dropped and reported. A send with an **unknown outcome** (no answer, a busy shop) keeps the line, marked with what was sent and what the server held, reported with Try again; before such a line is sent again the server cart is compared with the mark, and if the earlier send arrived it is not repeated (POST adds to a line: a blind retry would double it, web KI-037). The server cart is read again afterwards.
- A notice under the header while the cart moves and after it: what moved, what did not and why.

**Concepts to understand**
- Client state that must outlive a reload (browser storage) versus server state (the query cache), and why the browser holds no prices
- Validating what comes back from storage: it is input, like a request body
- Replaying writes that are not idempotent: an unknown outcome is checked against the server before a retry, partial failure, cross-tab coordination

**Done when**
- A signed-out visitor adds products, reloads, and still finds them in the cart with the server's current prices; after signing in the same lines are in the server cart and the browser holds nothing (unit, component and E2E).
- Merging into a server cart that already has the product adds the quantities (the API's rule) (unit and E2E).
- A product removed from the shop, and a failed send, are reported per line; only the failed line stays in the browser (unit).
- A send the server applied but whose answer was lost does not double the quantity when it is tried again (unit, web KI-037).
- Corrupt or foreign data under the key is discarded without an error (unit).
- Another tab sees a guest cart change (unit, the `storage` event).

**Not in this phase:** a server-side guest cart or anonymous checkout (no backend change); copying the account's cart back into the browser on sign-out; a stock check before replay (the server checks stock at checkout, Phase 13).

## E2E additions (`e2e/`)

`e2e/guest-cart.spec.ts` against the real backend: signed out, add two products from the shelf (found in the live catalogue, `e2e/live-data.ts`), reload, the guest cart shows them; "Sign in to check out" with a new account; the server cart (read through the API) has the same lines and quantities, and the browser's key is gone. A second spec merges into a cart that already has one of the products. The guest cart screen joins the layout, axe and keyboard matrix (`e2e/screens.ts`, catalogue answers stubbed). Existing specs that expected a signed-out add to go to sign-in change to the new behaviour.

## Your manual steps (user)

None.
