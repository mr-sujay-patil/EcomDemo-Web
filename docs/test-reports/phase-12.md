# Test Report: Phase 12 (Cart)

- **Date:** 2026-10-06
- **Branch:** `feature/phase-12-cart`
- **Run by:** Claude Code, on the owner's machine (Windows 11 + WSL2 Ubuntu; Playwright's Chromium, headless, in WSL)
- **Node / npm:** v24.21.0 (nvm) ; **no new dependencies**; `npm audit`: 0 vulnerabilities
- **Backend:** tag `phase-34-complete`. No stack was running, so I **started it from `../ecomdemo-backend-readonly`** at the pinned tag and stopped it at the end with `docker compose --profile tools down` (no `-v`). Backend sync: `origin/main` is 18 commits past the pin (dead-letter replay identity KI-040, `mvnw.cmd` line endings, a test flake); nothing touches the cart, auth or catalogue, so the pin stays.
- **Merge verification of Phase 11** (before branching): `main` at `fc320e1`, tag `phase-11-complete` on it; `npm ci && npm run verify` 578/578 and `npm run e2e` 310/310, read before going on.

## 1. Full regression

| Command | Result |
|---|---|
| `npm ci` | exit 0; `npm audit`: 0 vulnerabilities |
| `npm run verify` | exit 0: typecheck, lint (0 warnings), Prettier, `check:tokens`, **43 files, 607 tests passed** (was 40 files, 578), 0 skipped; main chunk 517.95 kB (162.33 gzip; was 515.26 / 161.44), a lazy `CartPage` chunk of 4.86 kB (+2.74 kB CSS) |
| `npm run test:coverage` | exit 0; **99.86 / 97.08 / 100 / 100** (was 99.84 / 96.8 / 100 / 100). Floor raised to 99.85 / 97.06 / 100 / 100 |

New tests (29, none removed or skipped): `CartPage.test.tsx` (guard with `next`; loading then lines with the server totals; **"price when added" shows the cart's price when the product price differs**; the stepper moves at once while the money waits; the answer replaces the whole cart; refusal puts the quantity back and shows the server's message; remove then Undo (DELETE then POST); Undo gone after five seconds; two quick clicks reach the server in order; empty state; load error with Retry; dismissing a message; a failed removal; Checkout), `ProductPage.test.tsx` (signed out goes to sign-in with `next`; add; busy button; refusal; no button for an admin), `ProductListPage.test.tsx` (the same from the shelf), `cart.test.ts` (an answer without a cart is refused, 4 calls), `api.test.tsx` (helpers with nothing loaded; a refused change before the cart loaded). `src/test/msw/cart.ts` is a pretend cart server. Changed: the placeholder test now uses `/orders`; the Phase 8 test of a *disabled* Add to cart is replaced by the four above.

## 2. End-to-end suite (`npm run e2e`)

Exit 0, **312 passed** (10.5 s), 0 skipped, 0 flaky (was 310). New, `e2e/cart.spec.ts` against the real backend: two real products added from the shelf, the header says "Cart, 2 items"; on `/cart` a quantity change moves the stepper and the header count; a line is removed and Undo brings it back with its quantity; **after every step the summary shows the `totalAmount` of the last cart answer the page received**; a signed-out Add to cart goes to `/sign-in?next=%2F` and comes back. Changed: `shelf.spec.ts` expects Add to cart to be enabled; `stubAccount` also stubs `GET /api/cart` (without it the real backend refuses the stub token with a 401 and the session ends: 77 matrix checks failed on the first run, which is how I found out).

⚠️ **Side effects on the backend:** two more real accounts per run (`e2e-…`) and their carts; the API has no delete. No failed sign-ins.

## 3. Acceptance (Done when)

| Check | Result | How |
|---|---|---|
| Add two products, change a quantity, remove and undo, totals always the server's | ✅ | E2E against the real backend (compares with the last `totalAmount` received) |
| Every cart call's answer replaces the cached cart | ✅ | unit: totals after a change are the answer's; nothing is summed in JS (`git grep` finds no arithmetic on prices) |
| Quantity change is optimistic and rolls back with an Alert | ✅ | unit |
| Add to cart from card and page; anonymous goes to sign-in and back; "In your cart (n)"; header count from the query | ✅ | unit and E2E |
| Cart page: "price when added", `lineTotal`, `totalAmount`, five-second Undo, empty state, no checkout when empty | ✅ | unit; the empty state has no Checkout button at all |
| Adding does not check stock | ✅ | no stock call; the product page's stock line is still a hint |
| Cache rules in `docs/decisions.md`; `docs/modules/cart.md` | ✅ | |

## 4. Widths and themes

The matrix passed at 360, 480, 768, 1024 and 1280 px, light and dark, for every screen; the cart screen now has two lines, one with a very long name. Screenshots in [`phase-12/`](phase-12/).

⚠️ **The matrix missed a real defect, and I found it only by looking.** At 1280 px the first cart screenshot showed the lines squeezed into a sliver with the summary on top of them: `CartLine` measures its own container (a container query), so it has no intrinsic width and the page's grid shrank to nothing. Nothing was clipped and nothing scrolled sideways, so every check passed. Fixed with `width: 100%` on the grid (commented in `cart.css`); I looked at 360 px light and 1280 px dark afterwards.

## 5. Things to know

- ⚠️ **Undo re-adds at today's catalogue price.** Remove is a real DELETE and Undo is a POST, so a line whose catalogue price changed in between comes back with the new price (and may move to the end of the list). Recorded in `docs/decisions.md`; the alternative (delaying the DELETE five seconds) would show a cart the server does not hold.
- ⚠️ **Backend documentation conflict (web KI-019):** the app's OpenAPI text says `unitPrice` is "the catalogue price right now, not a snapshot"; the code snapshots it at add time (backend decisions [Phase 20a]) and the integration guide agrees. The app follows the code and the guide. A backend doc fix is for the owner to request; nothing here depends on it.
- **Not done, on purpose:** a guest cart (web KI-012); an E2E for a 401 in the middle of a real cart session (the unit tests cover it).
- **Owner placeholders:** none new.
