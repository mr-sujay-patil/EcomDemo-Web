# Test Report: Phase 13 (Checkout and Order Tracking)

- **Date:** 2026-10-06
- **Branch:** `feature/phase-13-checkout`
- **Run by:** Claude Code, on the owner's machine (Windows 11 + WSL2 Ubuntu; Playwright's Chromium, headless, in WSL)
- **Node / npm:** v24.21.0 (nvm); **no new dependencies**; `npm audit`: 0 vulnerabilities
- **Backend:** tag `phase-34-complete`. I **started the stack from `../ecomdemo-backend-readonly`** at the pinned tag and stopped it at the end with `docker compose --profile tools down` (no `-v`). Backend sync before the phase: `origin/main` is 16 commits past the pin (CI scans KI-044, dead-letter replay KI-040, `mvnw.cmd` line endings, a test flake); nothing touches orders or the saga, and the saga deadline this phase **Requires** is in the pinned tag (backend Phase 32). The pin stays.
- **Merge verification of Phase 12** (before branching): `main` at `052ca5c`, tag `phase-12-complete`; `npm ci && npm run verify` 607/607, `npm run e2e` 312/312, read before going on.

## 1. Full regression

| Command | Result |
|---|---|
| `npm ci` | exit 0; `npm audit`: 0 vulnerabilities |
| `npm run verify` | exit 0: typecheck, lint (0 warnings), Prettier, `check:tokens`, **46 files, 641 tests passed** (was 43 files, 607), 0 skipped; main chunk 518.13 kB (162.43 gzip; was 517.95 / 162.33); new lazy chunk `OrderPage` 6.21 kB (+3.98 kB CSS); `CartPage` 5.75 kB (+2.99 kB CSS) |
| `npm run test:coverage` | exit 0; **99.88 / 97.31 / 100 / 100** (was 99.86 / 97.08 / 100 / 100). Floor raised to 99.87 / 97.3 / 100 / 100 |

New tests (34, none removed or skipped): `orderStatus.test.ts` (every transition, both final states, timers in the wrong phase, the numbers), `checkout.test.tsx` 21 (place and confirm with a real polling loop; the cart asked again; **no faster than 1 s and no slower than 2 s**; "taking longer" at 15 s, keeps asking, stops at 90 s and stays stopped (fake timers); stops once settled; cancelled with the reason and **add again** re-adds the lines, and names the ones that could not be added; **409 by its line** with "Lower to n", none when n is 0, other refusals on top; **a lost answer never posts twice**, in both cases (order made / not made), with older orders on the account, and when the re-reading fails too; a settled order shows at once; not found, not permitted, load error with Retry, a failed poll tried again; `/checkout` redirects), `orders.test.ts` (empty answers refused). Changed to match: the router test table (`/orders/42` is now "Order #42"; `/checkout` is no longer a page), the cart test for the old Checkout button (removed: the button is now Place order and is tested in `checkout.test.tsx`).

## 2. End-to-end suite (`npm run e2e`)

Exit 0, **305 passed** (11.8 s), 0 skipped, 0 flaky (was 312: the retired checkout screen's layout rows outweigh the four new specs). New, `e2e/checkout.spec.ts` against the real backend and its real saga: **a purchase reaches CONFIRMED** and the cart is empty after; **two Mechanical Keyboards (17 998) end CANCELLED** with "Payment declined: … exceeds the limit of 10000.00", and "Add these items to my cart again" brings back the cart with quantity 2; **three Laptop Sleeves (two in stock) are refused up front** with the server's sentence under that line, the cart and URL stay, and "Lower to 2" fixes it; an empty cart has no Place order button. Changed: `routes.spec.ts` (the lazy chunks are now `OrderPage` and `AdminPage`), `auth.spec.ts` (the round-trip spec used `/orders/42`, now a real page; it uses `/account`), `screens.ts` (`stubAccount` also stubs order 42: cancelled, with a long reason and product name, so the layout matrix measures the busiest order page; the checkout screen is gone).

⚠️ **Side effects on the backend, new this phase:** each run now **takes real stock**: one Desk Mat is bought and confirmed (the API cannot return it); the cancelled keyboards and refused sleeves take none. Seed stock is large (Desk Mat 60 at the start of this phase) but finite: after about 60 runs the first spec would be refused. Real accounts as before (about five per run); no failed sign-ins.

## 3. Acceptance (Done when)

| Check | Result | How |
|---|---|---|
| A purchase reaches CONFIRMED | ✅ | E2E against the real backend |
| An order above ₹10,000 ends CANCELLED with the reason, items can be added back | ✅ | E2E (real saga) and unit |
| A quantity above stock is refused up front, message by the line | ✅ | E2E and unit; cart kept |
| `201` is "received", not "confirmed" | ✅ | the page says "Placing your order" until the server says CONFIRMED; unit and E2E |
| Place order never retried automatically | ✅ | unit: one POST in every path, including a lost answer |
| Polling every 1-2 s, 15 s "taking longer", stop at 90 s, pause when hidden, stop when settled | ✅ | unit with fake timers (interval, 15 s, 90 s, stopped). The hidden-tab pause is TanStack Query's `refetchIntervalInBackground: false`; **not tested by a test of its own** |
| State machine in `orderStatus.ts`, tested alone | ✅ | `orderStatus.test.ts` |
| CONFIRMED: note from `src/content/notes.ts`, not rendered until written | ✅ | unit: no figure rendered while `null` |
| Cancelled: reason and add again | ✅ | unit and E2E |
| Empty cart: checkout disabled | ✅ | the empty cart has no Place order button at all |
| `docs/modules/checkout.md` | ✅ | |

## 4. Widths and themes

The matrix passed at 360, 480, 768, 1024 and 1280 px, light and dark, for every screen, including the new order page (cancelled, long reason and name). Screenshots in [`phase-13/`](phase-13/). I looked at the order page at 360 px (light) and 1280 px (dark): ⚠️ **one defect found by looking, fixed:** the order total in bold mono looked struck through, because only the Regular and Medium cuts of IBM Plex Mono are bundled and the browser drew a bold one itself. It now uses Medium (commented in `checkout.css`).

## 5. Things to know

- ⚠️ **The pause in a hidden tab is not proven by a test**: it relies on the query library's documented default (`refetchIntervalInBackground: false`), which I set explicitly. A test would have to fake the page's visibility.
- ⚠️ **The failed step is guessed.** The order API says why it was cancelled but not which step failed; the timeline marks the payment step when the reason starts with "Payment declined" and the stock step otherwise. A different wording from the backend would mark the stock step.
- ⚠️ **The 409 sentence is parsed** (`Insufficient stock for 'X': requested n, available m`). If the backend rewords it, the message still shows (on top, not by the line); a unit test pins the current wording.
- **Owner placeholders:** `src/content/notes.ts` `orderConfirmedNote` is `null`: nothing is shown on a confirmed order until the owner writes it (also listed in `RECENT.md`).
- **Not done, on purpose:** order history (Phase 14); push updates (web KI-013).
