# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-09-30
- **Phase:** 1 — Baseline App
- **Branch:** `feature/phase-01-baseline-app`
- **Step:** PR_OPEN
  (NOT_STARTED | PREFLIGHT | BRANCHED | PLANNING | IMPLEMENTING | TESTING | PR_OPEN | VERIFYING | WAITING_FOR_USER)
- **PR:** #1 https://github.com/mr-sujay-patil/EcomDemo-Web/pull/1
- **Backend pinned at:** `ki-001-fixed` (read-only clone `../ecomdemo-backend-readonly`)
- **Waiting for user:** YES: review and merge PR #1 (merge commit), then `merged, continue`

## Merge verification before this phase
Phase 0 (no PR by design; bootstrap commit `d6b0d66` on `main`): PASS on 2026-09-30. Merge settings via `gh api` (merge commits only, no auto-delete); `main` ruleset with no bypass (see `[Phase 00]` in `decisions.md`); a direct push to `main` rejected (GH013); read-only clone at `ki-001-fixed`, push fails locally; backend up from the clone, `GET /api/products` 200; tag `phase-00-complete` pushed.

## Design (decided; decisions.md entries written as `[Phase 01]`)
- TS 7.0.2 over the template's 6.x; oxlint dropped (Phase 4); `.npmrc` engine-strict + save-exact
- `typecheck` = `tsc -b`; `loadEnv` for `API_TARGET`; client-sent `X-Correlation-Id`

## Checklist (from the phase file's "What you'll implement")
- [x] Scaffold with the official Vite React + TS template, latest stable Vite/React/TS (verified on npm); versions in `decisions.md`
- [x] `.nvmrc` = latest Active LTS Node; `engines` to match
- [x] TS `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`; alias `@/` → `src/`
- [x] `vite.config.ts`: dev 5173, preview 4173, `/api` proxied to `API_TARGET ?? http://localhost:8080` for server and preview
- [x] Demo content removed; `src/features/catalog/ProductListPage.tsx`: name, INR price, category (`null` → "Other"); loading, empty, error (`ApiError.message` / `X-Correlation-Id`)
- [x] Hand-written `ProductResponse` marked `// replaced by generated types in Phase 7`
- [x] Scripts `dev`, `build`, `preview`, `typecheck`, `verify` = `typecheck && build`
- [x] README: prerequisites, `nvm use`, `npm ci`, backend from the read-only clone, `npm run dev`
- [x] Testing protocol (dev + preview against the backend; backend-down error state; console clean) → `docs/test-reports/phase-01.md` (all green; 360 px overflow of the support id found and fixed in `648b517`)
- [x] Docs: README, `decisions.md`, `RECENT.md`, tracker 🔵 (`docs/modules/catalog.md` is Phase 8's, per `docs/modules/README.md`) → PR

## Next action
Stopped: PR #1 awaits review. On `merged, continue` (or `approved, merge it` → `gh pr merge 1 --merge`, never `--delete-branch`): merge verification per `git-workflow.md` step 5 on `main` (`npm ci && npm run verify`; no `npm run e2e` before Phase 3), tag `phase-01-complete`, then start Phase 2 (`docs/phases/phase-02-testing.md`).

## ⚠️ Environment notes (this machine)
- One backend stack at a time: if `ecomdemo-gateway-service` is running, use it.
- The repo folder is `~/projects/ecomdemo-web` (lowercase), not `~/projects/EcomDemo-Web` as the docs say; relative paths still work.
- Node v24.21.0 via nvm in WSL, loaded only by interactive shells (`~/.bashrc`). Non-interactive commands must `. ~/.nvm/nvm.sh` first, or `npm` resolves to the Windows install under `/mnt/c`.
- Root `ecomdemo-frontend-integration-guide.md` is an untracked duplicate of `docs/backend/integration-guide.md` (owner's choice); leave it.

## ⚠️ Carried, not fixed (oldest first)
- 
