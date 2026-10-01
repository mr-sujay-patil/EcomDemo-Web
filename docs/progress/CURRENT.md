# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-01
- **Phase:** 6 — Routing
- **Branch:** `feature/phase-06-routing`
- **Step:** WAITING_FOR_USER
  (NOT_STARTED | PREFLIGHT | BRANCHED | PLANNING | IMPLEMENTING | TESTING | PR_OPEN | VERIFYING | WAITING_FOR_USER)
- **PR:** #8 (CI running on the head)
- **Backend pinned at:** `phase-33-complete` (clone moved; the stack running on :8080 is not ours and may still run `ki-001-fixed`: ask before replacing it)
- **Waiting for user:** YES: review of PR #8

## Merge verification before this phase
Phase 5 (PR #5, merge `701a9b3`) and the pin chore (PR #7, merge `ebc8a98`): PASS on 2026-10-01. `phase-05-complete` pushed; `verify` green on `main`; CI green on `ebc8a98`. `a768ebf` (post-merge progress commit) deliberately dropped by the owner.

## Checklist (from the phase file's "What you'll implement")
- [x] `src/app/router.tsx` (data router) with every route in the phase file; placeholders with final `h1` + one line naming the building phase; product list moves to `/`
- [x] Layout: header (store name, search and cart placeholders), main with "Skip to content", footer; `TODO(owner)` values only in `src/content/site.ts`
- [x] `/about`, `/returns`, `/shipping`: final headings and structure, every paragraph a `TODO(owner)`
- [x] Document titles per route (`EcomDemo · Your cart`), focus to the page `h1` on navigation, scroll restored
- [x] `lazy` route-level code splitting for `/admin/*`, `/checkout` and the assistant
- [x] Tests: every route renders its `h1`; 404; skip link moves focus; footer links resolve
- [x] `docs/architecture/routing.md` (route table and why each route exists)
- [x] E2E additions: every route by deep link and by navigation; the 404; keyboard skip link; layout matrix covers every route
- [x] Testing protocol → `docs/test-reports/phase-06.md`; README, `decisions.md`, `RECENT.md` rotated (Phase 04 to archive), tracker 🔵 → PR → STOP

## Next action
Confirm CI is green on the head of PR #8. Then wait for the owner's review. On `approved, merge it`: `gh pr merge 8 --merge` (no `--delete-branch`), merge verification on `main`, tag `phase-06-complete`. Next phase only on `continue` (Phase 7: typed API client; its Requires and the Phase 33 delta checklist are in `docs/backend/phase-33-delta.md`).

## ⚠️ Environment notes (this machine)
- One backend stack at a time: if `ecomdemo-gateway-service` is running, use it.
- The repo folder is `~/projects/ecomdemo-web` (lowercase), not `~/projects/EcomDemo-Web` as the docs say; relative paths still work.
- Node v24.21.0 via nvm in WSL, loaded only by interactive shells (`~/.bashrc`). Non-interactive commands must `. ~/.nvm/nvm.sh` first, or `npm` resolves to the Windows install under `/mnt/c`.
- Root `ecomdemo-frontend-integration-guide.md` is an untracked duplicate of `docs/backend/integration-guide.md` (owner's choice); leave it.
- Claude Code runs on Windows: run git/gh/npm in WSL. `wsl.exe -- bash -lc "…"` expands `$vars` in the outer shell first, so put multi-step commands in a script file and run `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash /mnt/c/…/script.sh` (Git Bash on the UNC path hits "dubious ownership"; `gh` is only in WSL). Redirect the script's output to a file in WSL and `cat` it, or lines get mangled. The Chrome extension blocks localhost: use headless Chrome (`--dump-dom`, `--enable-logging=stderr`).
- `~/.cache/ms-playwright` already holds `chromium-1243` and `chromium_headless_shell-1243`.

## ⚠️ Carried, not fixed (oldest first)
-
