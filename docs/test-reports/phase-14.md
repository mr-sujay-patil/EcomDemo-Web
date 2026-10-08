# Test Report: Phase 14 (Orders and Profile)

- **Date:** 2026-10-08
- **Branch:** `feature/phase-14-orders-profile`
- **Run by:** Claude Code, on the owner's machine (Windows 11 + WSL2 Ubuntu; Playwright's Chromium, headless, in WSL)
- **Node / npm:** v24.21.0 (nvm); **no new dependencies**; `npm audit`: 0 vulnerabilities
- **Backend:** pinned `phase-34-complete`. ⚠️ **I did not start the stack**: one was already running (the backend team's), and it is **ahead of the pin** (the app's OpenAPI document has `dltTimestamp` where the snapshot has `dltTopic`: dead-letter admin endpoints, from the KI-040 fix). Nothing this phase calls differs. Backend sync before the phase: `origin/main` is past the pin by KI-002/040/044/045/046 fixes and docs only; nothing touches orders, customers or the gateway contract. The pin stays.
- **Merge verification of Phase 13** (before branching): `main` at `2443ab3`, tag `phase-13-complete` on it. Its checks were recorded in Phase 13's report.

## 1. Full regression

| Command | Result |
|---|---|
| `npm run verify` | exit 0: typecheck, lint (0 warnings), Prettier, `check:tokens`, **49 files, 662 tests passed** (was 46 files, 641), 0 skipped, build ok |
| `npm run test:coverage` | exit 0; **99.89 / 97.58 / 100 / 100** (was 99.88 / 97.31 / 100 / 100). Floor raised to 99.88 / 97.5 / 100 / 100 |
| `npm audit` | 0 vulnerabilities |

New tests (21, none removed or skipped): `OrdersPage.test.tsx` 9 (newest first and the tie, columns, the reason, open an order, paging both ways, no pager for one page, an unreadable date, empty, error, Retry), `ProfilePage.test.tsx` 8 (load, trimmed save and the header follows, blank refused with no request, field error keeps the old name, server failure, load error, Retry, missing fields, a save answered without a name), `accounts/api.test.ts` (empty answers refused), `session.test.ts` 2 (`updateProfile`). Changed to match: the router test's placeholder case now uses `/search` (Phase 15), and the 403 case in `checkout.test.tsx` now expects "Order not found" and no server text.

## 2. End-to-end suite

⚠️ **`npm run e2e` did not run to the end**: its first step, `api:check`, fails against the running backend (it is past the pin, see above). I ran **`npx playwright test --project=chromium`** directly, which skips only that snapshot check. Result: **309 passed, 1 failed**, 0 flaky (was 305: five new specs).

- **The failure is not this phase's code:** `checkout.spec.ts` "a quantity above stock is refused up front" needs the seeded Laptop Sleeve 16" to have stock 2. On this shared backend its stock is **0** (read from `GET /api/products`), so the shelf has no "Add to cart" for it. Recorded as **web KI-020**; I did not change the backend's inventory.
- **New, `e2e/orders.spec.ts`, real backend and saga:** My orders lists an order placed earlier (a cancelled one: two keyboards, so no stock is taken) with its reason, and its detail opens with its lines; **a second customer** who goes to that order's id sees "Order not found" with none of its content, and the same for an unknown id; a customer with no orders sees the empty state; the profile shows the name and the no-password-change sentence, a saved name reaches the header ("Account: Meera"); a 101-character name is refused on the field.
- One run of the "Order not found" spec failed once with a console error "500" while the backend was still starting (health was 503 minutes before); it then passed six times in a row and in the full runs. Not reproduced; noted, not explained.
- Side effects on the backend: five real accounts per run for the new specs; no stock is taken for good by this phase's specs.

## 3. Acceptance (Done when)

| Check | Result | How |
|---|---|---|
| A customer sees their orders and details | ✅ | E2E (real) and unit |
| Can't see another customer's (two users) | ✅ | E2E: second account gets "Order not found" for the first's id; unit for 403 and 404 |
| 403 and 404 both "Order not found", never the reason | ✅ | unit asserts the server's text is absent |
| Table, newest first, client-side paging, `StatusBadge` with the reason for CANCELLED | ✅ | unit |
| `placedAt` in the user's time zone | ✅ | `Intl.DateTimeFormat` in the browser's zone; a **test of the zone itself is not written** (the unit tests check the format only) |
| Order detail with lines, `unitPrice` and `lineTotal`, the timeline for PENDING | ✅ | the Phase 13 page, unchanged apart from the 403 text |
| Profile: username, name, member since; edit full name only with the form kit; field errors | ✅ | unit and E2E |
| No password change, said plainly | ✅ | the page says so; unit and E2E |
| `docs/modules/orders.md`, `docs/modules/account.md` | ✅ | |

## 4. Widths and themes

The matrix passed at 360, 480, 768, 1024 and 1280 px, light and dark, for the orders, order and account screens. Screenshots in [`phase-14/`](phase-14/). I looked at orders at 360 px (light), orders at 1280 px (dark) and account at 360 px. ⚠️ **Two defects found, both fixed:** (1) a visually hidden `<caption>` on the table was flagged as clipped text by the layout check; the table is now named with `aria-label`. (2) At 360 px the table scrolled sideways inside its box and the Status column (the badge and the reason) was out of sight; below 560 px the status now sits under the date and the Status column is hidden. The status is therefore in the page twice (CSS shows one), which unit tests see as two.

## 5. Things to know

- ⚠️ **The checkout stock-refusal spec fails on the current shared backend** (web KI-020).
- ⚠️ **The E2E ran against a backend newer than the pin**, and `api:check` could not pass. If you want the pin moved to a newer backend tag, that is a separate `chore/pin-backend-<tag>` branch you approve.
- ⚠️ The time-zone claim is by construction (`Intl` with no zone given), not by a test that changes the zone.
- **Owner placeholders:** unchanged (`src/content/site.ts`, the policy pages, `orderConfirmedNote`).
- **Not done, on purpose:** cancelling an order (web KI-008); a status filter; changing the username or password (web KI-006).
