# Module: assistant (`src/features/assistant/`)

"Ask the shop": a sheet where a signed-in customer asks the assistant in plain words. Backend: `docs/backend/integration-guide.md`, "Shopping assistant". Decisions: `docs/decisions.md` [Phase 16].

## Parts

| File | What it does |
|---|---|
| `assistant.ts` | the two calls: `sendChat` (`POST /api/assistant/chat`) and `confirmAction` (`POST /api/assistant/actions/{id}/confirm`), and the reply type (`pendingAction` widened to `null`, web KI-021) |
| `useConversation.ts` | one conversation: the turns, the `conversationId` the server returned, the 503 flag, the confirm and dismiss of a proposal |
| `AssistantSheet.tsx`, `assistant.css` | the native `<dialog>`, the thread, the message box; `components/AssistantMessage` draws each message |

The header button ("Ask the shop", secondary, icon only under 640 px but still named) lives in `app/Layout.tsx`, which owns `open`. The sheet stays mounted when closed, so the conversation survives closing it. It is in memory only: a reload or signing out ends it.

## Rules

- **Confirm before act.** The only thing that changes the cart is the customer pressing **Add it**, which calls `confirm` with the proposal's `id`, then refetches the cart (so the header count follows). The reply's `pendingAction` is shown as an offer, never acted on. **Not now** asks the server nothing. After either, the offer is gone, so it cannot be pressed twice. The price on the offer is the server's `unitPrice`, never computed here.
- **A 404 on confirm** (unknown, expired, already confirmed) says so plainly and removes the offer; the cart is not touched. Any other failure shows the server's message and keeps the offer.
- **503** (no model): "The assistant isn't available right now." with **Search the shop instead**, which goes to `/search?q=` with what the person typed. The message box is disabled. The words "503" and "not configured" are never shown.
- **Who:** signed out gets a sign-in link that returns to this page; an admin is told it is for customers; only a CUSTOMER sees the box.
- **Sources** come as `{type, id, title}`; the sheet shows the titles, once each, as "Checked: …". No similarity, no tool names.
- **Look:** the design system's `AssistantMessage` (customer right, assistant labelled "Shop assistant"), one "Thinking…" caption while waiting. No sparkles, glow, gradients or typing animation. Messages are plain text, never HTML.
- **Dialog:** `showModal()`. The browser traps focus, makes the page behind inert, closes on Escape, and returns focus to the button that opened it. A click on the backdrop closes it. 400 px wide, the whole screen under 480 px. Enter sends, Shift+Enter is a new line, a message is at most 1000 characters.
- **Not here:** streaming, history beyond the session, a message a person can edit.

## Tests

`AssistantSheet.test.tsx` (open, close by Escape, Close and backdrop with focus back, the conversation survives closing, signed out and admin, answer with sources and "Thinking…", the conversation id on the second message, Enter and Shift+Enter, no double send, 1000 limit, a refused question, **nothing reaches the cart until Add it**, confirm refreshes the cart, Not now, 404, another failure, the photo, 503 and the search link), `assistant.test.ts` (the calls). jsdom has no modal `<dialog>`: `src/test/setup.ts` stands in for `showModal`, `close` and Escape, and does **not** trap focus. `e2e/assistant.spec.ts` checks the real thing in Chromium (Tab and Shift+Tab never reach the page behind; Escape returns focus), the confirm flow and the 404 with stubbed answers, the 503 path, and a real question against the backend (an answer or the 503 note, and no cart writes). `e2e/screens.ts`: `assistant-sheet`, `assistant-unavailable`.

## Running the full path

A real, cited answer and a proposal need a model on the backend **and** an indexed catalogue. With a model but no index (the seeded products are embedded only by the ADMIN backfill, `POST /api/products/embeddings/backfill`), the assistant answers "the store does not sell …". See the test report, section 5.
