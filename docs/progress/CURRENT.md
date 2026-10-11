# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-11
- **Task:** Fix KI-027 (approved by the owner 2026-10-11: "calibrate the CPU slowdown for the runner, and for the product page fetch its data from a small inline script in index.html"): LCP misses the 2.5 s budget in CI (PR #48's perf run: shelf 2.89 s, product page 2.79 s, benchmark index about 2345). `docs/KNOWN_ISSUES.md` row KI-027 (Fix queue), `docs/performance.md` "What is left"
- **Branch:** `fix/ki-027-lcp-budget` (cut from `main` at `d486b76`, the merge of PR #48; KI-039 and KI-040 merged and merge-verified there: local verify 1054 tests, CI on `main` green)
- **Step:** IMPLEMENTING
- **Backend pinned at:** commit `a85202fefc0e1390f63bda4c93ce85c3b8266f60` (unchanged by this fix)
- **Waiting for user:** no

## Checklist
- [x] Pre-flight: KI-039/040 merged (`d486b76`) and merge-verified; branch cut; KI-027 moved to the Fix queue, In progress
- [x] Calibration: red (`962b6c9`, 7 of 9 failed on a constant-4x stub), green (`fae37c7`, 9 of 9): `scripts/perf-calibrate.mjs` (Lighthouse 12.6.1's own `computeBenchmarkIndex`, median of 5, slowdown = index / 1100) → `PERF_CPU_SLOWDOWN` → `lighthouserc.cjs`; `perf-report.mjs` prints the phone each run simulated. Here: index 2305 → 2.1x
- [ ] Product page: red unit tests for the prefetch consumer, then the inline script in `index.html` (same GET, same headers that matter, photo preloaded), consumed once by the API client's fetch; CSP hash checked at build
- [ ] E2E: the product page loaded cold makes exactly one product request
- [ ] Docs: `docs/performance.md`, `docs/security.md`, decisions `[Fix KI-027]`, KI-027 Fixed (PR #NN)
- [ ] Full `npm ci && npm run verify`; perf only in CI (no backend buildable here)
- [ ] PR opened

## Next action
Product page prefetch: red unit tests for the consumer in `src/api/` (one product request, headers, once only, fall-through to the normal fetch), then the inline script in `index.html` and the CSP hash.

## ⚠️ Environment notes (this machine)
- This session runs in a cloud container (not the owner's WSL machine): Node 24 at `/opt/node24/bin`; the backend team's working copy is `/home/user/ecomdemo` (read only, never checked out or changed); a read-only clone is at `/home/user/ecomdemo-backend-readonly` (`a85202f`, push URL `no-push`).
- Tag pushes are refused here with 403: tags are given to the owner as commands.
- Backend images cannot be built here (Docker build containers have no network), so the stack cannot start in this container.

## ⚠️ Carried, not fixed (oldest first)
- Tag `ki-020-fixed` is not pushed: the owner runs `git tag ki-020-fixed 1f584e6 && git push origin ki-020-fixed`.
- Not on `origin` either (checked 2026-10-11 with `git ls-remote --tags`): `phase-25-complete` (`57fecf0`) and `ki-038-fixed` (`dbd1ba0`): the owner runs `git tag phase-25-complete 57fecf0 && git tag ki-038-fixed dbd1ba0 && git push origin phase-25-complete ki-038-fixed`.
- Tag `ki-032-fixed` (`f86e750`): the owner runs `git tag ki-032-fixed f86e750 && git push origin ki-032-fixed` (check with `git ls-remote --tags origin` first).
- Tags `ki-039-fixed` and `ki-040-fixed` (`d486b76`, PR #48): the owner runs `git tag ki-039-fixed d486b76 && git tag ki-040-fixed d486b76 && git push origin ki-039-fixed ki-040-fixed`.
