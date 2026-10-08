# Test Report: Phase 18 (Accessibility)

- **Date:** 2026-10-08
- **Branch:** `feature/phase-18-accessibility`
- **Run by:** Claude Code, on the owner's machine (Windows 11 + WSL2 Ubuntu; Playwright's Chromium, headless, in WSL)
- **Node / npm:** v24.21.0 (nvm) / 12.1.0; **one new dev dependency:** `@axe-core/playwright` 4.13.0 (exact; the newest stable, the `4.13.1-…` entries on npm are CI snapshots). Playwright 1.63.0.
- **Backend:** pinned `phase-34-complete`. No stack was running, so I started one from the read-only clone with `CUSTOMER_DB_PORT=15435` (a Windows app holds 5435) and stop it afterwards without `-v`.
- **Merge verification of Phase 17** (before branching): PR #21 merged as `10795ed`, tag `phase-17-complete` on origin, every branch commit in `main`, CI on `main` green, `npm ci && npm run verify` exit 0.
- **Backend sync** (before branching): `origin/main` of the clone is 40 commits past the pin (KI-002/003/004/005/006/040/044/045/046). Nothing new for the web beyond what Phase 16 reported; Phase 18 needs nothing from the backend. Pin unchanged.

## 1. Full regression

| Command | Result |
|---|---|
| `npm run verify` | exit 0: typecheck, lint (0 warnings), Prettier, `check:tokens`, **64 files, 827 tests passed** (was 824), 0 skipped, build ok |
| `npx vitest run --coverage` | exit 0; **99.93 / 98.05 / 100 / 100** (floor unchanged at 99.9 / 98 / 100 / 100) |

Unit tests: +4 new, 1 removed. New: the header sign-in link names itself (`aria-label`); a search option holds nothing focusable; the account menu closes when focus moves outside it (**fails on the old component, shown**); it stays open while focus moves between its own items. Removed: "keeps the list open while focus moves to a suggestion inside the box", which described the `<a>` inside the option that axe forbids (focus never moves into the list now). Nothing disabled or skipped.

## 2. End-to-end suite

`npm run e2e` (including `api:check`): **1004 passed, 1 failed** (was 419 + 1; 585 new tests).

| Spec | Tests | Result |
|---|---|---|
| `a11y.spec.ts` (axe) | 136 | pass |
| `keyboard-sweep.spec.ts` | 68 | pass |
| `keyboard-flows.spec.ts` | 5 | pass |
| `zoom.spec.ts` | 272 | pass |
| `motion.spec.ts` | 72 | pass |
| `visual.spec.ts` | 32 | pass |
| `layout.spec.ts` (refactored onto the shared `layout.ts`) | 340 | pass |

⚠️ **The one failure is web KI-020, unchanged:** `checkout.spec.ts` "a quantity above stock is refused up front". The Laptop Sleeve 16" has stock 0 (`GET /api/products` says so), so the shelf shows no "Add to cart" for it and the spec times out clicking it. Not caused by this phase; I changed nothing in checkout or stock.

Run twice (once before and once after the last fix, the account menu): same result both times. The browser console is checked in every spec (`fixtures.ts`): no console error, no React warning, no uncaught exception in any test.

## 3. Acceptance (Done when)

| Check | Result | How |
|---|---|---|
| axe: no serious or critical violation on any route, either theme | ✅ | `a11y.spec.ts`: 34 screens × 2 widths × 2 themes. First run **found real defects** (below); all fixed; no rule suppressed |
| Keyboard-only flows pass | ✅ | `keyboard-flows.spec.ts` (real backend: sign in, add, stepper with Space, place order, confirmed, My orders, sign out; signed-out product → sign in → back; register; search; admin dialog) with a pointer guard |
| Focus always visible, trapped only in dialogs | ✅ | `keyboard-sweep.spec.ts` on every screen: reaches every control, each changes look on focus, nothing painted over it, no trap |
| 200% zoom and a 20 px root font pass the overflow checks | ✅ | `zoom.spec.ts` also at 400% (320 px, WCAG reflow), which found three overflows (fixed) |
| `prefers-reduced-motion`: spinner slows, no other motion | ✅ | `motion.spec.ts`: 0.8 s a lap, 2.4 s reduced; nothing else animates, transitions or scrolls smoothly, on every screen, both preferences |
| `toHaveScreenshot` baselines for the key screens | ✅ | 32 pictures: shelf, product, cart, order CONFIRMED, order CANCELLED, sign-in, assistant, admin products × 360 / 1280 px × light / dark. Stubbed answers, exact compare, stable across repeated runs (304 passed twice in a row) |
| **A one-token change fails the baselines (shown, reverted)** | ✅ | `--radius-md` 4 px → 9 px: **32 of 32 fail**. 4 px → 5 px: **15 of 32 fail** (every screen that uses the token). Both reverted; `tokens.css` is not in the diff |
| `docs/accessibility.md` with the manual screen-reader checklist | ✅ | written; the pass itself is the owner's step (section 5) |
| Every guard can fail | ✅ | focus outline removed: **64 of 68** sweeps fail; a deliberate click: the pointer guard fails; the account menu test fails on the old component |

### Defects the new checks found (web KI-023, fixed here because the done-when needs them gone)

1. **Header links without a name at a phone width** (axe `link-name`, serious, 52 findings). A narrow-header rule hid the text of every ghost link: "Sign in" kept only an icon and no name, and "Admin" (no icon at all) became an empty link. Fix: the sign-in link has an `aria-label`; the text is hidden only on links that have an icon.
2. **Controls nested in search suggestions** (axe `nested-interactive`, serious). Each `role="option"` held a focusable `<a>`. Fix: an option is a plain row that opens the product; keys stay on the input.
3. **Sideways scroll at 320 px:** the header's tool row (once "Admin" kept its text), the import page's file input (a file input's built-in minimum width), and the style guide's header specimens. Fixes: the row wraps; `width: 100%; min-width: 0`; the specimen row takes the full width.
4. **The account menu stayed open when focus left it** (found by the new "not obscured" check, WCAG 2.4.11). At 360 px the open list sat on the search box that took focus. Fix: it closes when focus lands outside it (`focusin`, not blur, because Safari does not focus a clicked link).

## 4. Widths and themes

The existing matrix (360, 480, 768, 1024, 1280 px, light and dark) still passes (`layout.spec.ts`, 340 tests) with the fixes. Screenshots (360 and 1280, both themes) are in `docs/test-reports/phase-18/` (112 files, regenerated on the final code with `npm run e2e:report`). The 32 comparison baselines are in `e2e/visual.spec.ts-snapshots/`.

## 5. Things to know

- ⚠️ **The manual screen-reader pass is yours.** Follow `docs/accessibility.md` (about 20 minutes, NVDA, VoiceOver or TalkBack), then reply `done` with anything that felt wrong. A machine cannot judge whether the words, the reading order and the announcements make sense. I did **not** try a screen reader.
- **The visual baselines are Linux Chromium pictures** drawn here (WSL Ubuntu). **CI confirms them:** on the PR head the `e2e` job ran all 1005 tests, 32 of them visual, and all passed (run 37763460942). That run also passed the KI-020 spec, because CI starts the backend on a fresh database; here the shared stack's Laptop Sleeve is at 0.
- ⚠️ **Chromium only.** axe, the keyboard checks and the pictures run in Chromium. Safari and Firefox are not covered; neither are Windows forced-colours mode or text-spacing overrides (WCAG 1.4.12).
- ⚠️ **The focus ring's contrast** is not measured. The sweep proves a ring appears on every control and is not covered; whether `--focus` is bright enough on every surface is a manual check (listed in `docs/accessibility.md`).
- The sweep runs one width per theme (1280 px light, 360 px dark) to keep it quick; axe runs both widths in both themes.
- **Zoom is emulated** by viewport size (200% of 1280 = 640 px; 400% = 320 px), because Playwright has no browser-zoom switch; the layout is built on viewport and container queries, so this is what a zoomed window computes.
- **Deterministic data** for the pictures uses `page.route` stubs, not MSW (MSW runs in Vitest's Node process; the E2E suite drives the built app). Decision [Phase 18].
- **Updating a baseline** is a reviewed change: `npm run e2e:baselines`, then the reason goes in the PR. The PR description for this phase says why all 32 were created.
- **Owner placeholders:** unchanged (the `TODO(owner)` text in the footer is visible in the pictures, as it is on the site). Nothing new was written for the shop: the only new words are in `docs/accessibility.md`.
- **Not done, on purpose:** new features (the phase says none); Firefox and WebKit projects; a Docker image for rendering the pictures.

## 6. Clean-up

Dev and preview servers: Playwright starts and stops its own. The backend stack I started is stopped at the end of the phase without `-v` (recorded in `docs/progress/CURRENT.md`).
