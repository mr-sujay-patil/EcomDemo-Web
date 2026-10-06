# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-06
- **Phase:** 9 — Design System
- **Branch:** `feature/phase-09-design-system`
- **Step:** BRANCHED
  (NOT_STARTED | PREFLIGHT | BRANCHED | PLANNING | IMPLEMENTING | TESTING | PR_OPEN | VERIFYING | WAITING_FOR_USER)
- **PR:** none yet
- **Backend pinned at:** `phase-34-complete`. Use a running `ecomdemo-gateway-service` if there is one.
- **Waiting for user:** no

## Merge verification before this phase
Phase 8 (PR #10, merge `878fdff`) and the backend re-pin chore (PR #11, merge `ceb5220`): PASS on 2026-10-06. Both PRs MERGED and ancestors of `origin/main`, branches kept; `npm ci && npm run verify` 188/188 and `npm run e2e` 229/229 (`api:check` green) on `main` against `phase-34-complete`; CI green on both PR heads; tag `phase-08-complete` pushed. Tracker ✅ for Phase 8 is this branch's first commit.
Backend sync (standing rule): `origin/main` is 3 docs-only commits past `phase-34-complete` (Phase 34 closeout, backend KI-046 flaky `LoginThrottleIT`); no API change, no newer tag; pin unchanged.

## Checklist (from the phase file's "What you'll implement")
- [ ] `src/styles/tokens.css` + `src/styles/fonts/` (self-hosted, `font-display: swap`, two faces preloaded)
- [ ] Theme: `data-theme` on `<html>`, `useTheme`, toggle where `patterns.md` puts account controls; persisted in `localStorage`
- [ ] Port the 17 components to `src/components/<Name>/` (tsx, css, index.ts, test); `ProductCard` has no SKU; `image` fed from `imageUrl` (KI-002 is fixed in `phase-34-complete`, see `docs/backend/phase-34-delta.md`)
- [ ] Restyle every existing page with the components (catalogue, product, layout, footer, 404, placeholders)
- [ ] `/styleguide` (dev and preview only), every component in its states, both themes
- [ ] `scripts/check-tokens.mjs` in `verify`; a hex colour in a component fails it (shown, then reverted)
- [ ] Component tests (roles/labels; stepper limits; StatusBadge word; ProductCard stock 0; StaffNote name/role/date)
- [ ] E2E: layout matrix on `/styleguide`; fonts served as `font/woff2`
- [ ] `docs/architecture/design-system.md`; testing protocol → `docs/test-reports/phase-09.md`; README, `decisions.md`, `RECENT.md` rotated, tracker 🔵 → PR → STOP

## Next action
Read `design-system/components/index.d.ts`, `components.css` and `src/index.tsx`, then post a short plan (tokens and fonts first, then components in the order of the phase file) and implement. Standing rules: sync the backend clone (`git fetch`) before each phase; backend doubts go to the owner as a forwardable message.

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
