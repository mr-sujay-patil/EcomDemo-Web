# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-01
- **Phase:** 4 — Code Quality
- **Branch:** `feature/phase-04-code-quality`
- **Step:** PR_OPEN
  (NOT_STARTED | PREFLIGHT | BRANCHED | PLANNING | IMPLEMENTING | TESTING | PR_OPEN | VERIFYING | WAITING_FOR_USER)
- **PR:** #4 (see Next action)
- **Backend pinned at:** `ki-001-fixed` (read-only clone `../ecomdemo-backend-readonly`)
- **Waiting for user:** YES: review and merge PR #4 (merge commit), then `merged, continue`

## Merge verification before this phase
Phase 3 (PR #3, merge commit `d0f0fad`): PASS on 2026-09-30. PR state MERGED; branch tip `6a26391` is an ancestor of `origin/main`; `git log main..branch` and `git diff --stat` empty; branch exists locally and on GitHub; deliverables present on `main`; `npm ci && npm run verify` green (6/6) and `npm run e2e` 22/22 against `ki-001-fixed`. Tag `phase-03-complete` pushed.

## Design (decided)
- User chose (2026-09-30): **TypeScript 6.0.3** (TS 7 ships no JS compiler API; typescript-eslint 8.71.0 wants `<6.1.0`) and **ESLint 9.39.5** (jsx-a11y 6.10.2 declares ESLint ≤9). Commit `98054bc` pins TS 6.
- `eslint.config.js` (flat, `defineConfig`): `recommendedTypeChecked` + `projectService`; hooks + jsx-a11y on `src/**`; playwright `flat/recommended` on `e2e/**` with `expect-expect` `assertFunctionNames: ['ready']`; `no-console` off in tests/`e2e`; `disableTypeChecked` for `**/*.js`; `eslint-config-prettier` last
- Prettier: `printWidth 120`, no semicolons, single quotes (matches the existing code); `*.md` and `design-system/` ignored (hand-aligned docs; supplied library for Phase 9); `design-system/` also ignored by ESLint
- `lint` uses `--max-warnings=0`. Probe file proved each required rule fires (then deleted)

## Checklist (from the phase file's "What you'll implement")
- [x] ESLint flat config: `typescript-eslint` (type-aware), React Hooks, `jsx-a11y`, Playwright plugin for `e2e/`; Prettier + `eslint-config-prettier`
- [x] Rules: `no-floating-promises`, `exhaustive-deps`, `no-explicit-any` as error, `no-console` except in tests (explained in the PR)
- [x] Scripts `lint`, `format`, `format:check`; `verify` = `typecheck && lint && format:check && test && build`
- [x] `.editorconfig`; no pre-commit hook
- [x] Fix what the rules find, in commits separate from the configuration (`style:` commit, 4 files; lint found only `expect-expect`, fixed in config)
- [x] Done when: unformatted `src/unformatted.ts` → `verify` exit 1 at `format:check`; deleted → exit 0
- [x] E2E: 22/22 against `ki-001-fixed`
- [x] Testing protocol → `docs/test-reports/phase-04.md`; docs (README, `decisions.md`, `RECENT.md` rotated, tracker 🔵) → PR

## Next action
Stopped: PR #4 awaits review. On `merged, continue` (or `approved, merge it` → `gh pr merge 4 --merge`, never `--delete-branch`): merge verification per `git-workflow.md` step 5 on `main` (`npm ci && npm run verify && npm run e2e`, backend at `ki-001-fixed`), tag `phase-04-complete`, then start Phase 5 (`docs/phases/phase-05-github-actions.md`).

## ⚠️ Environment notes (this machine)
- One backend stack at a time: if `ecomdemo-gateway-service` is running, use it.
- The repo folder is `~/projects/ecomdemo-web` (lowercase), not `~/projects/EcomDemo-Web` as the docs say; relative paths still work.
- Node v24.21.0 via nvm in WSL, loaded only by interactive shells (`~/.bashrc`). Non-interactive commands must `. ~/.nvm/nvm.sh` first, or `npm` resolves to the Windows install under `/mnt/c`.
- Root `ecomdemo-frontend-integration-guide.md` is an untracked duplicate of `docs/backend/integration-guide.md` (owner's choice); leave it.
- Claude Code runs on Windows: run git/gh/npm in WSL. `wsl.exe -- bash -lc "…"` expands `$vars` in the outer shell first, so put multi-step commands in a script file and run `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash /mnt/c/…/script.sh` (Git Bash on the UNC path hits "dubious ownership"; `gh` is only in WSL). The Chrome extension blocks localhost: use headless Chrome (`--dump-dom`, `--enable-logging=stderr`).
- `~/.cache/ms-playwright` already holds `chromium-1243` and `chromium_headless_shell-1243`.

## ⚠️ Carried, not fixed (oldest first)
- 
