# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-08
- **Phase:** 16 — AI Shopping Assistant
- **Branch:** `feature/phase-16-assistant`
- **Step:** PR_OPEN
- **PR:** #20 (CI running on the head)
- **Backend pinned at:** `phase-34-complete`. No stack runs now: start it from `../ecomdemo-backend-readonly` with `CUSTOMER_DB_PORT=15435 docker compose up --build --wait -d` (Windows app SignalRgb holds 5435) and stop it at the end with `docker compose --profile tools down` (no `-v`).
- **Waiting for user:** YES: review of the Phase 16 PR; the ADMIN embeddings backfill for the full assistant path; relay web KI-019, KI-020 and KI-021 to the backend team

## Merge verification before this phase
Phase 15 (PR #19, merge `cff22cd`, tag `phase-15-complete`): CI green on the fixed head; on `main` `npm run verify` 704/704, `npm run e2e` 343/344: the one failure is web KI-020's stock-refusal spec (Laptop Sleeve stock is 0 on the persistent stack). Backend sync 2026-10-08: `origin/main` is past the pin by KI-002/003/040/044/045/046 fixes and docs (KI-003 is compose loopback ports) and a comment edit in `ProductIndexer`; nothing for the assistant. Pin stays `phase-34-complete`.

## Checklist (from the phase file's "What you'll implement")
- [x] `POST /api/assistant/chat` (`message` 1-1000, `conversationId?`); keep the returned `conversationId` for the session
- [x] Assistant sheet: native `<dialog>`, "Ask the shop" secondary button in the header; 400 px, full screen under 480 px; focus trapped, Escape closes, focus returns
- [x] Messages with `AssistantMessage`: customer right-aligned; assistant labelled "Shop assistant" with "Checked: …" sources; one "Thinking…" caption; no sparkles, glow, gradients, typing animation
- [x] Confirm before act: `pendingAction` shows the product with "Add it" / "Not now"; Add calls `POST /api/assistant/actions/{id}/confirm`, then refreshes the cart; 404 says expired or already confirmed
- [x] 503: "not available right now" and a way to search instead
- [x] `docs/modules/assistant.md`
- [x] Tests: nothing reaches the cart without the click; 404 on confirm; 503; focus trap and Escape; E2E additions (`e2e/`)

## Next action
Wait for the owner's review. On `approved, merge it`: wait for CI to pass (read it; the e2e job runs on a fresh backend), `gh pr merge 20 --merge` (no `--delete-branch`); merge verification on `main` (`npm ci && npm run verify`; start the stack with `CUSTOMER_DB_PORT=15435 docker compose up --build --wait -d` in `../ecomdemo-backend-readonly`, run `npm run e2e`, read the result before tagging; the checkout stock spec may fail on a used database, web KI-020); tag `phase-16-complete`; stop the stack (`docker compose --profile tools down`, no `-v`). The first commit of the next branch updates the tracker row (16 ✅) and this file. Before the next phase: fetch the backend clone and compare with the pin. Next phase only on `continue`: Phase 17 (read its file first).

## ⚠️ Environment notes (this machine)
- The backend team's own stack (`~/projects/ecomdemo`, compose project `ecomdemo`) was running on 2026-10-06 and reported `phase-34-complete-2-g40fed61` (two commits past the tag). Its API matched the tag (snapshots differ only by `imageUrl` and the image path). Never stop or touch it; starting the clone's stack fails on the container names while it runs.
- One backend stack at a time: if `ecomdemo-gateway-service` is running, use it.
- The repo folder is `~/projects/ecomdemo-web` (lowercase), not `~/projects/EcomDemo-Web` as the docs say; relative paths still work.
- Node v24.21.0 via nvm in WSL, loaded only by interactive shells (`~/.bashrc`). Non-interactive commands must `. ~/.nvm/nvm.sh` first, or `npm` resolves to the Windows install under `/mnt/c`.
- Root `ecomdemo-frontend-integration-guide.md` is an untracked duplicate of `docs/backend/integration-guide.md` (owner's choice); leave it.
- Claude Code runs on Windows: run git/gh/npm in WSL. `wsl.exe -- bash -lc "…"` expands `$vars` in the outer shell first, so put multi-step commands in a script file and run `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash /mnt/c/…/script.sh` (Git Bash on the UNC path hits "dubious ownership"; `gh` is only in WSL). Redirect the script's output to a file in WSL and `cat` it, or lines get mangled. The Chrome extension blocks localhost: use headless Chrome (`--dump-dom`, `--enable-logging=stderr`).
- `~/.cache/ms-playwright` already holds `chromium-1243` and `chromium_headless_shell-1243`.

## ⚠️ Carried, not fixed (oldest first)
- web KI-020: `e2e/checkout.spec.ts` refused-order spec needs Laptop Sleeve stock 2; the shared backend has 0.
- The backend stack running here (`ecomdemo-gateway-service`) is ahead of the pin: `npm run e2e` stops at `api:check` (dead-letter admin schema `dltTimestamp`). Run `npx playwright test --project=chromium` and say so, or have the owner approve a `chore/pin-backend-<tag>`.
