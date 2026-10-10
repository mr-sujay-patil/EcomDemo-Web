# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-10
- **Task:** fix KI-028 (`e2e/visual.spec.ts` "shelf at 1280 px, light": the sort `<select>`'s text sometimes rasterised differently, 202 pixels)
- **Branch:** `fix/ki-028-select-font` (cut from `main` at `59ee563`)
- **Step:** PR_OPEN
- **Backend pinned at:** commit `669a9ed1dfcc8ef0d89608c87ef05421bb157fb6` (unchanged by this fix)
- **Waiting for user:** NO

## Checklist
- [x] Root cause, with evidence: the select's label copy (UA shadow root) kept a fallback face after the swap (KNOWN_ISSUES KI-028); not reproduced on local Chromium 1194
- [x] Regression check: `e2e/fonts.spec.ts` (guard fails on a fallback face; passes the shelf; re-layout keeps focus, choice, place); mutation-checked
- [x] Fix: `settleFonts` in `e2e/fonts.ts`, used by `visual.spec.ts` (no tolerance, no mask, no baseline change)
- [x] `npm ci && npm run verify` (904 unit tests); local e2e: `fonts.spec.ts` 3/3 (and 9/9 with --repeat-each=3), visual 32/32 unchanged versus the old wait. The visual spec against the real baselines runs only in CI's `e2e` job
- [ ] Docs: KNOWN_ISSUES (fixed), decisions only if one changes, this checkpoint; PR

## Next action
Finish `npm ci && npm run verify`, push, open the PR `Fix KI-028: ...`, add its number to the KI row, then STOP for the owner (CI's `e2e` job is the only place the visual spec runs against the real baselines).

Local e2e here used a stub gateway (a tiny Node server answering `/api/products`) only to pass `global-setup`, with `/opt/pw-browsers` Chromium 1194: the committed baselines are CI's Chromium 1243, so only relative comparisons are meaningful locally.

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
