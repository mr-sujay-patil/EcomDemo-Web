# Accessibility (WCAG 2.2 AA)

What was tested in Phase 18, how to run it, what a machine cannot tell you, and the screen-reader pass the owner does by hand.

Decisions behind the checks: `docs/decisions.md` [Phase 18]. The layout rules they build on: `CLAUDE.md`, "Conventions".

## What is tested, and how

All of it is Playwright against the production build (`npm run e2e`). Screens come from one list, `e2e/screens.ts`: **a screen added there is picked up by every check below.** Answers are stubbed for the screens that need a signed-in person; the keyboard flows use the real backend.

| Check | File | What it proves | WCAG |
|---|---|---|---|
| axe | `e2e/a11y.spec.ts` | No serious or critical violation on any screen (signed out, customer, admin) at 360 and 1280 px, light and dark. Tags: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`. No rule is switched off. | 1.1.1, 1.3.1, 1.4.3, 2.4.x, 4.1.2 and the rest axe covers |
| Keyboard sweep | `e2e/keyboard-sweep.spec.ts` | One lap of Tab on every screen reaches every control (inside the dialog when one is open), each control changes its look when focused, nothing is painted over the focused control, and focus is never trapped. | 2.1.1, 2.1.2, 2.4.7, 2.4.11 |
| Keyboard-only flows | `e2e/keyboard-flows.spec.ts` | Sign in, put a Desk Mat in the cart, change the quantity with Space, place the order, find it under My orders, sign out; open a product signed out, sign in and come back; register; search; the admin delete dialog traps focus, closes on Escape and returns focus. A pointer guard fails the test if any mouse or touch event reaches the page. | 2.1.1, 2.1.2, 2.4.3 |
| Dialogs | `e2e/assistant.spec.ts`, `e2e/keyboard-flows.spec.ts` | Focus stays inside an open dialog; Escape closes it; focus goes back to the button that opened it. | 2.1.2, 2.4.3 |
| Zoom and font size | `e2e/zoom.spec.ts` | The overflow and clipped-text checks of `layout.spec.ts` pass at 200% zoom (640 px), at 400% zoom (320 px, the reflow width) and with a 20 px root font on a phone and a desktop. | 1.4.4, 1.4.10 |
| Motion | `e2e/motion.spec.ts` | Nothing but the button spinner animates, nothing transitions, nothing scrolls smoothly, on every screen, with and without `prefers-reduced-motion`. The spinner turns at 0.8 s a lap, 2.4 s when motion is reduced. | 2.3.3, 2.2.2 |
| Visual comparison | `e2e/visual.spec.ts` | Eight key screens (shelf, product, cart, order confirmed, order cancelled, sign-in, assistant, admin products) at 360 and 1280 px, light and dark, match their baselines exactly. | not WCAG: catches what the layout checks cannot see |
| Unit | `AccountMenu.test.tsx`, `SearchBox.test.tsx` | The header sign-in link names itself; a search option holds nothing focusable; the account menu closes when focus leaves it. | 4.1.2, 2.4.11 |

Each guard was shown able to fail before it was trusted (see the Phase 18 test report): the focus outline removed fails the sweep, a click fails the pointer guard, and a `--radius-md` change fails the baselines.

## Running them

```bash
npm run e2e                                    # everything, with the backend running at the pinned tag
npx playwright test e2e/a11y.spec.ts --project=chromium
npx playwright test e2e/keyboard-sweep.spec.ts e2e/keyboard-flows.spec.ts --project=chromium
npx playwright test e2e/zoom.spec.ts e2e/motion.spec.ts --project=chromium
npx playwright test e2e/visual.spec.ts --project=chromium
```

A failing axe test prints one line per violation: the rule, its help text and the first selectors. A failing visual test leaves the expected, actual and diff pictures in `test-results/` and in the CI report artifact.

### Updating the visual baselines

A changed baseline is a reviewed change. When a picture changes on purpose:

1. Run `npm run e2e:baselines` (on Linux; the pictures are `*-chromium-linux.png`, and CI draws the same pixels).
2. Look at every changed file in the diff.
3. Put the reason in the PR description. A baseline that changes with no reason in the PR is a bug.

## What a machine does not catch

axe finds roughly a third to a half of accessibility problems. These need a person:

- Whether the **words** make sense read aloud: link text out of context, an error that says what to do, "Checked: …" on the assistant's answers.
- Whether the **reading order** and the announcements feel right: what is read when a cart changes, when an order moves to Confirmed, when an error appears.
- Whether a **focus ring is easy to see** on a real screen in daylight. The ring is 2 px of `--focus` (the brand colour) with a 2 px offset; the sweep proves it is there, not that it is bright enough for you.
- **Touch target comfort** on a real phone. axe checks the 24 px minimum of WCAG 2.2 (2.5.8); thumbs prefer more.
- **Cognitive load**: whether a flow is simple enough.

Not tested: Safari and Firefox (the suite runs Chromium only), Windows high-contrast mode, text-spacing overrides (WCAG 1.4.12), and every screen reader. The manual pass below is how those gaps are covered.

## Manual screen-reader pass (about 20 minutes)

Do this once, with one screen reader, and reply `done` with anything that felt wrong. Use the real shop (`npm run dev`, or the preview) signed out first, then signed in as a customer. Pick one:

- **NVDA on Windows** (free, nvaccess.org) with Chrome or Firefox. Start it with Ctrl+Alt+N. Useful keys: Down arrow reads the next line; **H** next heading; **D** next landmark; **F** next form field; **B** next button; **K** next link; Tab moves between controls; Insert+F7 lists headings, links and landmarks; Ctrl stops speech.
- **VoiceOver on iPhone or Mac.** iPhone: Settings, Accessibility, VoiceOver, then swipe right to move on and double-tap to press. Mac: Cmd+F5, then VO (Ctrl+Option) with the arrow keys.
- **TalkBack on Android**: Settings, Accessibility, TalkBack, then swipe right to move on and double-tap to press.

Tick each line. Note the screen, what you heard, and what you expected, for any that fail.

### Signed out

- [ ] **Skip link.** On a fresh page, the first Tab reads "Skip to content". Enter moves you into the main content, so the next thing read is the page itself, not the header again.
- [ ] **Landmarks.** The list of landmarks has a banner, a search, a primary navigation, main, and "Store information" navigation in the footer.
- [ ] **Headings.** Each page has one level 1 heading, and the headings below it nest in order (nothing jumps from 1 to 3).
- [ ] **Header controls.** Each is announced with a name that says what it does: "Search products", "Ask the shop", the theme button (it says the current mode and what pressing it does), "Sign in", "Cart" (with the count once there are items). None is read as just "button" or "link".
- [ ] **Search.** Type two letters of a product. Is it announced that suggestions are available? Do the arrow keys read each suggestion, and Enter open it?
- [ ] **Shelf.** The filters read as buttons with their count; the sort reads as a labelled list; each product reads as a product name link followed by price and stock; the count line ("Showing 1 to N") is announced when a filter changes.
- [ ] **A product page.** Name, price, stock, and the Add to cart button are all reached in a sensible order. Does the picture have a useful description, or is it skipped (a decorative tile should be skipped)?
- [ ] **Add to cart signed out.** You are taken to Sign in; the page says why or at least where you are.
- [ ] **Sign in with a wrong password.** The error is announced without you hunting for it, and focus lands somewhere useful. Is the field with the problem named?
- [ ] **Register.** Each field has a label, the password rules are read, and the reveal button reads "Show password" or "Hide password" to match what it will do.

### Signed in as a customer

- [ ] **Account menu.** "Account: <name>" says it is collapsed or expanded; its items are reached by Tab; Escape closes it and returns you to the button.
- [ ] **Cart.** Each line reads its product, price and quantity. The quantity buttons say "Increase" and "Decrease", and the new quantity is announced when you press one. "Remove" names the product. After Remove, "removed" and Undo are announced.
- [ ] **A refused quantity** (more than is in stock) is announced as an alert, next to the line.
- [ ] **Place order.** On the order page, are the progress steps read in order, and is "Your order is confirmed." (or the cancellation reason) announced when it arrives, without you moving?
- [ ] **My orders.** The table has a name, its headers are read with each cell, and the status is text, not only a colour.
- [ ] **Ask the shop (assistant).** Opening the sheet moves focus into it; Tab never reaches the page behind; Escape closes it and returns to "Ask the shop". An answer is announced when it arrives. A suggested product reads as an offer with "Add it" and "Not now", and nothing is added until you press "Add it".
- [ ] **Session ending.** About a minute before the session ends, a notice appears: is it announced?

### Admin (optional, if you use the console)

- [ ] **Products table** has a name and readable headers; "Edit" and "Delete" name the product they act on.
- [ ] **Delete dialog.** Focus enters it, the typed-name field is labelled, Escape closes it, and focus returns to the Delete button.
- [ ] **Import.** The file field is labelled; the preview and any error file path are read; the result is announced.

### At the end

- [ ] Zoom the browser to 200% and to 400%: nothing is cut off and you never scroll sideways, apart from a wide table inside its own frame.
- [ ] Turn on your system's "reduce motion" setting: the only thing that moves is the small spinner, and it is slower.
- [ ] Anything that felt slow, confusing or wrong, even if it passed the list.

Reply `done`, with your notes. A problem you report becomes a row in `docs/KNOWN_ISSUES.md` and a fix, not a change inside this phase.
