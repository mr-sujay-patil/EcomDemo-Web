# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-01
- **Phase:** 8 — Server State
- **Branch:** `feature/phase-08-server-state`
- **Step:** IMPLEMENTING
  (NOT_STARTED | PREFLIGHT | BRANCHED | PLANNING | IMPLEMENTING | TESTING | PR_OPEN | VERIFYING | WAITING_FOR_USER)
- **PR:** not yet
- **Backend pinned at:** `phase-33-complete`. Start the stack from the clone if `ecomdemo-gateway-service` is not running; stop it after (never `-v`).
- **Waiting for user:** NO

## Merge verification before this phase
Phase 7 (PR #9, merge `58c20ae`): PASS on 2026-10-01. PR MERGED; branch tip `3a1ded7` is an ancestor of `origin/main`; `git log` and `git diff --stat` empty; branch kept; `npm ci && npm run verify` 137/137 and `npm run e2e` 208/208 (`api:check` green) on `main` against `phase-33-complete`; CI green on `main`; tag `phase-07-complete` pushed. Tracker ✅ is this branch's first commit.

## Checklist (from the phase file's "What you'll implement")
- [ ] TanStack Query (latest stable): `QueryClient` in `src/app/providers.tsx`, defaults recorded in `docs/decisions.md`
- [ ] Key factory + hooks in `src/features/catalog/api.ts` (`catalogKeys.list()`, `catalogKeys.detail(id)`)
- [ ] Catalogue page: one `GET /api/products`; client-side category filter (`null` = "Other"), sort (name, price), 24 per page; filter, sort, page in the URL
- [ ] Product page `/products/:id`: name, category, price, description, stock hint; 404 → "No longer available" + link back; disabled Add to cart ("Sign in to add to your cart")
- [ ] Prefetch a product on card hover or focus
- [ ] Loading states reserve space and say what loads; error states: `ApiError.message` / correlation id + Retry
- [ ] Tests with MSW: filter and sort update URL and list; pagination; 404 page; error and retry
- [ ] `docs/modules/catalog.md`
- [ ] E2E: filter → URL → reload keeps it; sort by price; next page; open a product; unknown id → "No longer available"
- [ ] Done when (real backend): shelf shows seeded products, filter/sort/pages survive reload, product page by link and deep URL
- [ ] Testing protocol → `docs/test-reports/phase-08.md`; README, `decisions.md`, `RECENT.md` rotated (Phase 06 to archive), tracker 🔵 → PR → STOP

## Next action
Read KI-003 and KI-004 in `docs/KNOWN_ISSUES.md` and the catalogue rows of the guide, then add `@tanstack/react-query` (exact, latest stable).

## ⚠️ Environment notes (this machine)
- One backend stack at a time: if `ecomdemo-gateway-service` is running, use it.
- The repo folder is `~/projects/ecomdemo-web` (lowercase), not `~/projects/EcomDemo-Web` as the docs say; relative paths still work.
- Node v24.21.0 via nvm in WSL, loaded only by interactive shells (`~/.bashrc`). Non-interactive commands must `. ~/.nvm/nvm.sh` first, or `npm` resolves to the Windows install under `/mnt/c`.
- Root `ecomdemo-frontend-integration-guide.md` is an untracked duplicate of `docs/backend/integration-guide.md` (owner's choice); leave it.
- Claude Code runs on Windows: run git/gh/npm in WSL. `wsl.exe -- bash -lc "…"` expands `$vars` in the outer shell first, so put multi-step commands in a script file and run `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash /mnt/c/…/script.sh` (Git Bash on the UNC path hits "dubious ownership"; `gh` is only in WSL). Redirect the script's output to a file in WSL and `cat` it, or lines get mangled. The Chrome extension blocks localhost: use headless Chrome (`--dump-dom`, `--enable-logging=stderr`).
- `~/.cache/ms-playwright` already holds `chromium-1243` and `chromium_headless_shell-1243`.

## ⚠️ Carried, not fixed (oldest first)
-
