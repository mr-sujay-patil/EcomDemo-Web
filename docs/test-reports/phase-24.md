# Test Report: Phase 24 (Guest Cart)

- **Date:** 2026-10-10
- **Branch:** `feature/phase-24-guest-cart`
- **Run by:** Claude Code in a cloud container (Linux, no Docker, no backend stack), Node v24.21.0, npm 11.19.0
- **New dependencies:** none.
- **Backend:** none was running here. The pin is unchanged (commit `669a9ed`). The phase needs no backend change: `POST /api/cart/items` (adds to an existing line, `404` for an unknown product), `GET /api/cart` and `GET /api/products/{id}` are in the pinned OpenAPI snapshots (`api/openapi/app.json`, `catalog.json`).
- **Pre-flight:** KI-025 merged (PR #43), CI on `main` green; `npm ci && npm run verify` on `main` in this container: exit 0, **904 tests**. Tags `ki-020-fixed` and `ki-025-fixed` are still for the owner to push (tag pushes are refused here with 403).

## 1. Unit and component tests

`npm ci && npm run verify`: see section 4. **981 tests** in 79 files (was 904 in 74); coverage stays above the floor (lines and functions 100 %).

| File | What it proves |
|---|---|
| `guestCart.test.ts` | the stored shape is read back exactly; 19 kinds of foreign or corrupt value are discarded (not JSON, wrong shape, id 0, text id, fractional values, quantity 0 or 100, a product twice, more than 50 lines, a bad `sent` mark); only known fields survive; add, set, remove, take (an extra added by another tab stays, unmarked), limits 1 to 99, a full cart |
| `guestCartStore.test.ts` | written to `localStorage` and the key removed when empty; survives a reload; corrupt data removed without an error; only `productId` and `quantity` stored; another tab's change through the `storage` event (and a cleared storage), listeners told only of a real change; memory only when storage is missing or throws |
| `guestReplay.test.ts` | lines posted in order and the browser emptied; merge adds quantities; a 404 dropped and the rest moved; a 503 stops the run and keeps that line (marked) and the next; **an applied POST whose answer was lost is not sent again on the retry (web KI-037)**; a marked line that did not arrive is sent again; nothing sent when the account's cart cannot be read first; nothing more once the session ends; a line another tab sent is skipped; only 404 and 400 are permanent; the Web Lock is taken by name, and skipped where there is none |
| `GuestCartPage.test.tsx` | empty, loading, lines with the catalogue's current price and **no line or cart total**; Sign in to check out goes to `/sign-in?next=%2Fcart`; counts; quantity change in the browser only; stock hints; a gone product (404) and Remove it; Remove and Undo; Undo gone after 5 s; a catalogue error with the reference and Retry; another tab's change; a refused session on `/cart` goes to sign-in; a deliberate sign-out shows the guest cart |
| `GuestCartReplay.test.tsx` | signing in moves the cart, the notice, the server's lines and header count; "Moving…" while it runs; merge; a gone product reported and dropped; a busy shop kept, named and moved by Try again; the lost-answer case end to end (one POST in total); a refused lock keeps everything; nothing said when another tab moved it first; Dismiss; View cart; an admin's sign-in sends nothing and keeps the guest cart; a sign-out mid-way sends nothing more and keeps the rest |
| Changed on purpose | five tests pinned the Phase 12 rule the user replaced ("a signed-out add, or `/cart`, goes to sign-in"): `ProductListPage`, `ProductPage`, `router` (the header's Cart link), `auth.flow` (`/cart` left the guard list) and `CartPage` (now: an *ended* session on `/cart` still goes to sign-in). Each now asserts the approved behaviour; none was skipped or deleted. A new router test covers the focus code for a page with no heading yet (a redirect), which the old cart redirect used to reach |

## 2. End-to-end

**The suite cannot run in this container**: there is no backend stack (no Docker) and Playwright's own Chromium build (1243) is not installed. CI's `e2e` job runs it against a fresh backend at the pin; that run is the real check of:

- `e2e/guest-cart.spec.ts` (new): a visitor adds two products found in the live catalogue (`productsToBrowse`, `findOnShelf`), reloads, the header still counts 3, storage holds only ids and quantities, `/cart` shows the current prices and no Order summary; Sign in to check out with a new account; back on `/cart`, "Your cart is up to date", two lines "price when added", and **the account's cart read through the API** (`cartOf`) has the same quantities while storage holds nothing. A second test merges into an account that already has the product (2 + 1 = 3).
- Changed to the Phase 24 behaviour: `routes.spec.ts` (the header's Cart link signed out opens the guest cart), `cart.spec.ts` (a signed-out add stays on the page and moves on sign-in), `keyboard-flows.spec.ts` (by keyboard: add signed out, open the cart, Sign in to check out, back on the cart with the product).
- `npx playwright test --list`: the new and changed specs compile and are registered.

**What did run here (scratch, not a substitute for CI):** the new `cart-guest` screen of the matrix (products stubbed in the screen itself) against a stand-in gateway that answers an empty catalogue, with the preinstalled Chromium 1194 (`/opt/pw-browsers`) through a scratch config that was not committed: `layout` (5 widths x 2 themes), `a11y` (axe at 360 and 1280, light and dark), `keyboard-sweep` (light, dark) and `motion` (both preferences): **18 passed**. The four screenshots below come from the same run of `report.spec.ts`.

## 3. Screens

The guest cart (two stubbed products, one with a long name and one left, 2 and 3 in the cart):

| 360 px light | 360 px dark | 1280 px light | 1280 px dark |
|---|---|---|---|
| `phase-24/cart-guest-360-light.png` | `phase-24/cart-guest-360-dark.png` | `phase-24/cart-guest-1280-light.png` | `phase-24/cart-guest-1280-dark.png` |

⚠️ Not captured: the notice after sign-in ("Your cart is up to date", "Some items did not move to your cart"); it needs a session, which the stubbed screens get only by signing in, and a guest cart at that moment. Its states are covered by `GuestCartReplay.test.tsx`; to see it: `npm run dev` with the backend up, add two products signed out, sign in.

## 4. Gates

| Command | Result |
|---|---|
| `npm ci && npm run verify` | exit 0: typecheck, lint, format, tokens, **981 tests** (79 files) with coverage (statements 99.94 %, branches 98.21 %, functions and lines 100 %), build, budgets, dist check |
| Bundle (`check-budgets`) | the shelf loads 8 files, **134.8 KB** gzipped (was 5 files, 131.6 KB; limit 170). Rolldown now puts three small modules the shelf already used (`useQuery`, `money`, `useSession`) in their own chunks, because the lazy `/cart` chunk shares them |
| `npm run perf` | ⚠️ not run: it needs Docker and the backend. This phase touches the cart and the shelf's JavaScript, so CI's `perf` job is the check (web KI-033: the shelf's score is close to its minimum) |
| `npm run e2e` | ⚠️ not run here (section 2); CI's `e2e` job |

## 5. Manual checks for the owner

1. With the backend up: `npm run dev`, signed out add two products from the shelf, reload, open the cart: current prices, no totals, "Sign in to check out".
2. Sign in: the notice says the items moved; the cart page shows them with "price when added".
3. Two tabs: add in one, the other tab's header count follows.
4. The screen-reader pass in `docs/accessibility.md` now covers the signed-out add and the notice (still open since Phase 18).
