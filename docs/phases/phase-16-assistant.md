# Phase 16: AI Shopping Assistant

| | |
|---|---|
| **Stage** | Stage 3: Shopping |
| **Technology** | Chat UI + confirm-before-act |
| **Branch** | `feature/phase-16-assistant` |
| **PR title** | `Phase 16: AI Shopping Assistant` |
| **Requires** | `phase-15-complete` on `main`; an LLM configured on the backend for the full path |
| **Needs from the backend** | an LLM configured on the backend |
| **Completion tag** | `phase-16-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** Customers can ask the shop assistant in plain words; answers cite sources; nothing changes in the cart without the customer's click.

**What you'll implement**
- `POST /api/assistant/chat` with `{message (1-1000), conversationId?}`; keep the returned `conversationId` for the next message (session only).
- An assistant **sheet** (a native `<dialog>`), opened by a secondary button "Ask the shop" in the header: 400 px wide, full screen under 480 px; focus trapped, Escape closes, focus returns.
- Messages with the design system's `AssistantMessage`: the customer's right-aligned; the assistant's labelled "Shop assistant" with its `sources` ("Checked: …"). No sparkles, glow, gradients or typing animation; one caption "Thinking…" while waiting.
- **Confirm before act:** when `pendingAction` is present, show the product with "Add it" / "Not now"; Add calls `POST /api/assistant/actions/{pendingAction.id}/confirm`, then refreshes the cart query. A 404 (expired or already confirmed) says so plainly.
- **503** (no model): the sheet says the assistant isn't available right now and offers search instead.
- `docs/modules/assistant.md`.
- Tests: nothing reaches the cart without the click; 404 on confirm; 503; focus trap and Escape.

**Concepts to understand**
- Human-in-the-loop actions
- Accessible dialogs
- Designing AI features that don't look like "AI features"

**Done when**
- With a model configured: a cited answer and a proposal added only by confirming (E2E), or ⚠️ with steps if no model is available here. Without one: the 503 path (E2E).

**Not in this phase:** streaming responses, history beyond the session.

## E2E additions (`e2e/`)

Open and close the sheet by keyboard; the 503 path; with a model, a question → cited answer → confirm → cart count increases.

## Your manual steps (user)

For the full test, start the backend with your LLM settings (backend Phase 29).
