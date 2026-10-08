# Test Report: Phase 16 (AI Shopping Assistant)

- **Date:** 2026-10-08
- **Branch:** `feature/phase-16-assistant`
- **Run by:** Claude Code, on the owner's machine (Windows 11 + WSL2 Ubuntu; Playwright's Chromium, headless, in WSL)
- **Node / npm:** v24.21.0 (nvm); **no new dependencies**
- **Backend:** pinned `phase-34-complete`. I started the stack from the read-only clone (none was running) and stopped it afterwards without `-v`. ⚠️ A Windows app (`SignalRgb`) holds host port 5435, so it was started with `CUSTOMER_DB_PORT=15435` (a variable the clone's `compose.yaml` reads); nothing in the clone was edited. Backend sync before the phase: `origin/main` is past the pin by KI-002/003/040/044/045/046 fixes and docs (KI-003 is compose loopback ports) and a comment edit in `ProductIndexer`; nothing for the assistant. The pin stays.
- **Merge verification of Phase 15** (before branching): `main` at `cff22cd`, tag `phase-15-complete`; verify 704/704; E2E 343/344, the one failure being web KI-020.

## 1. Full regression

| Command | Result |
|---|---|
| `npm run verify` | exit 0: typecheck, lint (0 warnings), Prettier, `check:tokens`, **56 files, 729 tests passed** (was 54 files, 704), 0 skipped, build ok |
| `npm run test:coverage` | exit 0; **99.91 / 97.77 / 100 / 100** (was 99.9 / 97.62 / 100 / 100). Floor raised to 99.9 / 97.7 / 100 / 100 |

New tests (25, none removed or skipped): `AssistantSheet.test.tsx` 22 (open, closed until asked, Escape with focus back, Close, backdrop, the conversation survives closing, signed out, admin, "Thinking…" then the labelled answer with sources, the conversation id on the second message, Enter and Shift+Enter, no double send, only spaces, the 1000 limit, a refused question, **nothing reaches the cart until Add it** (no confirm call, no cart write, no count), confirm with the action id then the cart refetched, Not now, 404, another failure keeps the offer, the proposal's photo, 503 with the search link) and `assistant.test.ts` 3. Changed to match: the header-search specs found nothing wrong; `src/test/setup.ts` gained a stand-in for modal `<dialog>` and `Element.scrollTo` (jsdom has neither).

## 2. End-to-end suite

`npm run e2e` (including `api:check`): **369 passed, 1 failed** (was 344). ⚠️ The failure is **web KI-020**, `checkout.spec.ts` "a quantity above stock is refused up front": the Laptop Sleeve's stock is 0 on this stack's persistent database (it was 2 on a fresh one). Not this phase's code; the same spec passed against a fresh stack.

- **New, `e2e/assistant.spec.ts` (6):** keyboard open (Enter on the button), Tab 8 times and Shift+Tab 6 times never reach the page behind, Escape closes and the button has focus again; a signed-in customer lands in the message box; **with stubbed answers** nothing reaches the cart or `confirm` until Add it, then the header count goes from 3 to 4; a 404 on confirm says the suggestion expired; the 503 path shows the plain note and the search link goes to `/search?q=quiet%20keyboard`; **against the real backend and a real account** a question gets an answer (or the 503 note) and no cart request is sent.
- **Console:** the guard stays on. The stubbed 503 and 404 are allowed by exact message only.

## 3. Acceptance (Done when)

| Check | Result | How |
|---|---|---|
| With a model configured: a cited answer and a proposal added only by confirming | ⚠️ | The **confirming** half is proven (unit and E2E with stubbed answers: nothing before the click, the cart refetched after). The **real** cited answer and proposal could not be shown: a model is configured here, but it answers "the store does not sell any keyboards" because the seeded products are not in the search index (see section 5). Manual steps below |
| Without a model: the 503 path | ✅ | unit and E2E (stubbed 503): the note, the search link, the box disabled |
| Open and close by keyboard, focus trapped, Escape, focus returns | ✅ | E2E in Chromium (the real dialog); unit for the wiring |
| `404` on confirm says so plainly | ✅ | unit and E2E |
| `AssistantMessage`, "Shop assistant", "Checked: …", one "Thinking…", no sparkles, glow, gradients or typing animation | ✅ | unit; `check:tokens` finds no gradients or emoji |
| `docs/modules/assistant.md` | ✅ | |

## 4. Widths and themes

The matrix passed at 360, 480, 768, 1024 and 1280 px, light and dark, for the two new screens (the sheet with a proposal, the sheet with the 503 note) and for every other screen (the header changed). Screenshots in [`phase-16/`](phase-16/). I looked at the sheet at 1280 px (light) and the 503 note at 360 px (dark). ⚠️ **One defect found, fixed:** with the new button the header's nav was 346 px wide at 360 px and the page scrolled sideways; below 640 px "Ask the shop" is now its icon alone, still named "Ask the shop" for screen readers.

## 5. Things to know

- ⚠️ **The real path needs one manual step from you.** The backend has a model, but `GET /api/products/search` and the assistant's own product lookup see only the backend's `TEST` probe products. The seeded products are embedded only by an ADMIN backfill. As an admin: `POST /api/products/embeddings/backfill` (backend README, "Semantic search"), then in the sheet ask "Tell me about the Mechanical Keyboard" (expect a cited answer: "Checked: Mechanical Keyboard") and "Add one to my cart" (expect an offer with Add it and Not now; the cart stays as it was until you press it). I did not use admin credentials.
- ⚠️ The sheet with a **screen reader** was not tried. Manual: open it with the keyboard, listen for the dialog's name "Ask the shop", send a message, and listen for the answer being announced (the "Thinking…" line is a status).
- **Web KI-021:** the assistant OpenAPI document types `pendingAction` as always present; the backend sends `null`. Handled in one place; to report to the backend team.
- The proposal's photo and category come from `GET /api/products/{id}`, one request per offer (cached afterwards).
- **Owner placeholders:** unchanged. The sheet's wording (the hint, the 503 note, the expiry note) is interface copy under the voice rules; the owner may want to reword it.
- **Not done, on purpose:** streaming and history beyond the session (the phase says so).
