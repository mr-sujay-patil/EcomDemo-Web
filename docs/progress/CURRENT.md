# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-06
- **Phase:** 9 — Design System
- **Branch:** `feature/phase-09-design-system`
- **Step:** WAITING_FOR_USER
  (NOT_STARTED | PREFLIGHT | BRANCHED | PLANNING | IMPLEMENTING | TESTING | PR_OPEN | VERIFYING | WAITING_FOR_USER)
- **PR:** open to `main` (number: `gh pr list`; CI running on the head)
- **Backend pinned at:** `phase-34-complete`. Use a running `ecomdemo-gateway-service` if there is one.
- **Waiting for user:** YES: review of the Phase 9 PR, and the manual check (`/styleguide`, both themes, laptop and phone)

## Merge verification before this phase
Phase 8 (PR #10, merge `878fdff`) and the backend re-pin chore (PR #11, merge `ceb5220`): PASS on 2026-10-06 (see the first commit of this branch). Backend sync before the phase: `origin/main` three docs-only commits past `phase-34-complete`; pin unchanged.

## Checklist (from the phase file's "What you'll implement")
- [x] `src/styles/tokens.css` + `src/styles/fonts/`
- [x] Theme: `data-theme`, `useTheme`, toggle in the header, `localStorage`
- [x] The 17 components in `src/components/<Name>/`, tests, `image` from `imageUrl`
- [x] Every existing page restyled
- [x] `/styleguide` (dev and E2E preview only)
- [x] `scripts/check-tokens.mjs` in `verify`; hex colour shown failing, reverted
- [x] Component tests; E2E (matrix on `/styleguide`, fonts `font/woff2`, images, theme, header search)
- [x] `docs/architecture/design-system.md`, `docs/test-reports/phase-09.md` + screenshots, README, `decisions.md`, `RECENT.md` rotated (Phase 07 archived), tracker 🔵, `design-system/` mirrored
- [x] `npm run verify` 362 tests, coverage 99.4 / 95.78 / 100 / 100, `npm run e2e` 247/247

## Next action
Confirm CI is green on the PR head. Then wait for the owner's review (and their `changes: …` after the manual check). On `approved, merge it`: `gh pr merge <n> --merge` (no `--delete-branch`), merge verification on `main` (`npm ci && npm run verify`, `npm run e2e` against the running gateway), tag `phase-09-complete`. Before the next phase: `git fetch` the backend clone and compare `origin/main` with the pin (standing rule); backend doubts go to the owner as a forwardable message. Next phase only on `continue`: Phase 10 (read its file first).

## ⚠️ Environment notes (this machine)
- The backend team's own stack (`~/projects/ecomdemo`, compose project `ecomdemo`) was running on 2026-10-06 and reported `phase-34-complete-2-g40fed61` (two commits past the tag). Its API matched the tag (snapshots differ only by `imageUrl` and the image path). Never stop or touch it; starting the clone's stack fails on the container names while it runs.
- One backend stack at a time: if `ecomdemo-gateway-service` is running, use it.
- The repo folder is `~/projects/ecomdemo-web` (lowercase), not `~/projects/EcomDemo-Web` as the docs say; relative paths still work.
- Node v24.21.0 via nvm in WSL, loaded only by interactive shells (`~/.bashrc`). Non-interactive commands must `. ~/.nvm/nvm.sh` first, or `npm` resolves to the Windows install under `/mnt/c`.
- Root `ecomdemo-frontend-integration-guide.md` is an untracked duplicate of `docs/backend/integration-guide.md` (owner's choice); leave it.
- Claude Code runs on Windows: run git/gh/npm in WSL. `wsl.exe -- bash -lc "…"` expands `$vars` in the outer shell first, so put multi-step commands in a script file and run `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash /mnt/c/…/script.sh` (Git Bash on the UNC path hits "dubious ownership"; `gh` is only in WSL). Redirect the script's output to a file in WSL and `cat` it, or lines get mangled. The Chrome extension blocks localhost: use headless Chrome (`--dump-dom`, `--enable-logging=stderr`).
- `~/.cache/ms-playwright` already holds `chromium-1243` and `chromium_headless_shell-1243`.

## ⚠️ Carried, not fixed (oldest first)
-
