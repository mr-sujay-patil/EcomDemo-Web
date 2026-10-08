# Test Report: Phase 15 (Semantic Search)

- **Date:** 2026-10-08
- **Branch:** `feature/phase-15-search`
- **Run by:** Claude Code, on the owner's machine (Windows 11 + WSL2 Ubuntu; Playwright's Chromium, headless, in WSL)
- **Node / npm:** v24.21.0 (nvm); **no new dependencies**; `npm audit`: 0 vulnerabilities
- **Backend:** pinned `phase-34-complete`. I started the stack from the read-only clone (none was running) and stopped it afterwards without `-v`. ⚠️ Docker could not publish host port 5435 (the customer database): a Windows process, `SignalRgb`, holds it. I did not touch that process; the stack was started with `CUSTOMER_DB_PORT=15435`, a variable the clone's `compose.yaml` reads. Nothing in the clone was edited. Backend sync before the phase: `origin/main` is past the pin by KI-002/040/044/045/046 fixes and docs, plus a comment-only edit in `ProductIndexer`; nothing changes the search contract. The pin stays.
- **Merge verification of Phase 14** (before branching): `main` at `8cf2be8`, tag `phase-14-complete`; verify 662/662 and E2E 310/310 on `main`.

## 1. Full regression

| Command | Result |
|---|---|
| `npm run verify` | exit 0: typecheck, lint (0 warnings), Prettier, `check:tokens`, **54 files, 704 tests passed** (was 49 files, 662), 0 skipped, build ok |
| `npm run test:coverage` | exit 0; **99.9 / 97.62 / 100 / 100** (was 99.89 / 97.58 / 100 / 100). Floor raised to 99.89 / 97.6 / 100 / 100 |
| `npm audit` | 0 vulnerabilities |

New tests (43; one test removed, see below; none skipped; 662 + 43 - 1 = 704): `search.test.ts` (7: URL round trip, trimming and cutting, bad prices, the fallback filter), `useDebouncedValue.test.tsx` (3, fake timers), `SearchBox.test.tsx` (11: one request for a burst of typing at 50 ms a key, nothing under two characters, order and prices, arrow keys and wrapping, Enter on a highlight and on none, Escape and blur, a click, focus inside the box, 503 shows nothing, follows the URL), `SearchPage.test.tsx` (18: no query sends no request, server order and no similarity, filters sent with limit 20, form from the URL, Apply writes the URL, a reversed price range, empty, error and Retry, the four fallback cases, hover prefetch, add to cart and a refused add, **a slow old answer is aborted and never shown**), `api.test.ts` (3), and one `Header` test for the new `search` slot.
Changed to match: the router test that named the Phase 15 placeholder was **removed** because the placeholder no longer exists (`/search` is a real page; the route is still covered by `e2e/routes.spec.ts`); the two header-search router tests now use the `combobox` role and the new heading.

## 2. End-to-end suite

`npm run e2e` (including `api:check`) **passed: 344 of 344**, 0 flaky (was 310). Against the pinned stack, the stock-refusal spec of web KI-020 passed too.

- **New, `e2e/search.spec.ts`:** "something to type on" on the real backend gives results or the fallback notice, and the URL brings the same search back after a reload (the box shows the words); with a stubbed 503 the page says so and matches words in the catalogue; eight keystrokes 40 ms apart send **one** suggestion request, after the typing; suggestions open a product with ArrowDown and Enter.
- **Real path:** the backend answered `GET /api/products/search` with 200 and similarities, so the embedding model is configured on this stack: the full semantic path ran. (Its results include the backend's own `TEST` probe products, which is data, not this phase.) The forced-503 specs keep the fallback covered either way.
- **Console:** the guard stays on. Chromium logs a 503 as a console error itself, so the specs that force one allow exactly that message (`unavailableResponseError`).
- Side effects on the backend: none (search reads only).

## 3. Acceptance (Done when)

| Check | Result | How |
|---|---|---|
| A search returns results against the real backend | ✅ | E2E on the real stack (200 with similarities) |
| …or the fallback when the embedding model isn't configured | ✅ | forced 503 in E2E and unit; the page says which it used |
| The URL is shareable | ✅ | unit (state from the URL, Apply writes it) and E2E (reload) |
| Typing fast sends no request per keystroke | ✅ | unit (fake timers and a request count) and E2E (one request, after the typing) |
| Stale requests are cancelled | ✅ | unit: the old request's `signal` is aborted and its late answer never shown |
| Results in the server's order, similarity not shown | ✅ | unit (fixtures ranked backwards) |
| `q` up to 200 characters | ✅ | `maxLength` on the box; a longer value in a link is cut; unit |
| `docs/modules/search.md` | ✅ | |

## 4. Widths and themes

The matrix passed at 360, 480, 768, 1024 and 1280 px, light and dark, for `/search` and the three new screens (results, fallback, suggestions open). Screenshots in [`phase-15/`](phase-15/). I looked at results at 360 px (light), suggestions at 1280 px (dark) and the fallback at 1280 px (light). ⚠️ **One defect found, fixed:** at 360 and 480 px the page scrolled 2 px sideways, because the price inputs' own width stretched their grid track past the 140 px field; the field now has a `minmax(0, 1fr)` track.

## 5. Things to know

- ⚠️ **Not checked by a person:** the suggestions list with a screen reader (it follows the combobox pattern: `aria-expanded`, `aria-controls`, `aria-activedescendant`, a listbox of options). Manual step: with NVDA or VoiceOver, type two letters in the header box, press ArrowDown, and listen for the product name and "1 of 3"-style position.
- ⚠️ The result-list in-flight state shows "Searching…" only; there is no skeleton.
- Suggestions are not shown for a box prefilled from the URL until the person types (on purpose).
- **Owner placeholders:** unchanged (`src/content/site.ts`, the policy pages, `orderConfirmedNote`). The phase adds no human copy beyond the interface wording, which follows the voice rules (no "503", no exclamation marks, no em dashes).
- **Not done, on purpose:** search analytics (the phase says so); paging past 20 results.
