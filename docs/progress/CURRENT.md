# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-09-30
- **Phase:** 4 — Code Quality
- **Branch:** `feature/phase-04-code-quality`
- **Step:** BRANCHED
  (NOT_STARTED | PREFLIGHT | BRANCHED | PLANNING | IMPLEMENTING | TESTING | PR_OPEN | VERIFYING | WAITING_FOR_USER)
- **PR:** none yet
- **Backend pinned at:** `ki-001-fixed` (read-only clone `../ecomdemo-backend-readonly`)
- **Waiting for user:** no

## Merge verification before this phase
Phase 3 (PR #3, merge commit `d0f0fad`): PASS on 2026-09-30. PR state MERGED; branch tip `6a26391` is an ancestor of `origin/main`; `git log main..branch` and `git diff --stat` empty; branch exists locally and on GitHub; deliverables present on `main`; `npm ci && npm run verify` green (6/6) and `npm run e2e` 22/22 against `ki-001-fixed`. Tag `phase-03-complete` pushed.

## Design (decided)
- (to fill while implementing)

## Checklist (from the phase file's "What you'll implement")
- [ ] ESLint flat config: `typescript-eslint` (type-aware), React Hooks, `jsx-a11y`, Playwright plugin for `e2e/`; Prettier + `eslint-config-prettier`
- [ ] Rules: `no-floating-promises`, `exhaustive-deps`, `no-explicit-any` as error, `no-console` except in tests (explained in the PR)
- [ ] Scripts `lint`, `format`, `format:check`; `verify` = `typecheck && lint && format:check && test && build`
- [ ] `.editorconfig`; no pre-commit hook
- [ ] Fix what the rules find, in commits separate from the configuration
- [ ] Done when: `npm run verify` fails on a deliberately unformatted file (shown, then reverted)
- [ ] E2E: suite still passes (no new checks)
- [ ] Testing protocol → `docs/test-reports/phase-04.md`; docs (README, `decisions.md`, `RECENT.md`, tracker 🔵) → PR

## Next action
Implement the checklist from the top, starting with the ESLint and Prettier configuration.

## ⚠️ Environment notes (this machine)
- One backend stack at a time: if `ecomdemo-gateway-service` is running, use it.
- The repo folder is `~/projects/ecomdemo-web` (lowercase), not `~/projects/EcomDemo-Web` as the docs say; relative paths still work.
- Node v24.21.0 via nvm in WSL, loaded only by interactive shells (`~/.bashrc`). Non-interactive commands must `. ~/.nvm/nvm.sh` first, or `npm` resolves to the Windows install under `/mnt/c`.
- Root `ecomdemo-frontend-integration-guide.md` is an untracked duplicate of `docs/backend/integration-guide.md` (owner's choice); leave it.
- Claude Code runs on Windows: run git/gh/npm in WSL. `wsl.exe -- bash -lc "…"` expands `$vars` in the outer shell first, so put multi-step commands in a script file and run `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash /mnt/c/…/script.sh` (Git Bash on the UNC path hits "dubious ownership"; `gh` is only in WSL). The Chrome extension blocks localhost: use headless Chrome (`--dump-dom`, `--enable-logging=stderr`).
- `~/.cache/ms-playwright` already holds `chromium-1243` and `chromium_headless_shell-1243`.

## ⚠️ Carried, not fixed (oldest first)
- 
