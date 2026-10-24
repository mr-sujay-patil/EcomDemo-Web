# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-21
- **Task:** Fix KI-042 + KI-043 together (one cause: the shelf's LCP on CI, 2.72 s and 2.65 s in PRs #51 and #54, budget 2.5 s); approved by the owner 2026-10-21 ("Fix KI-042+043 together"). `docs/KNOWN_ISSUES.md` rows KI-042, KI-043; `docs/performance.md`
- **Branch:** `fix/ki-042-043-shelf-lcp` (cut from `main` at `ddd09c3`, the merge of PR #54; merge-verified: local verify 1097 tests, CI on `main` green)
- **Step:** PR_OPEN (draft PR #55): the fix is proven; CI is red on two new advisories this PR did not cause (KI-044, KI-045)
- **Backend pinned at:** commit `a85202fefc0e1390f63bda4c93ce85c3b8266f60` (unchanged)
- **Waiting for user:** YES: approve a fix for KI-044 + KI-045 (a second open PR, High), which PR #55 then waits for

## Checklist
- [x] Pre-flight: PR #54 merged and verified; branch cut; KI-042 and KI-043 In progress
- [x] Measure on CI: `scripts/perf-lcp-inputs.mjs` (5 unit tests) prints what each first run's simulated LCP is built from; draft PR #55 (CI only runs on PRs), run 39647266492 at `528ab3f`, all green
- [x] Cause (CI run 39647266492, shelf 2.55 s median: 2.55, 2.70, 2.55; product page under 2.5 s): the OBSERVED load is fast and the products are in the first paint (FCP 291 ms, LCP 336 ms, +45 ms; DOM 240 elements; the e2e-changed-catalogue hypothesis is out). 14 of 20 requests ended before the observed LCP, among them **all six font faces (119.9 KB)**: Lantern's LCP graph keeps every request that ended before the observed LCP except low-priority images (`LargestContentfulPaint.getOptimisticGraph`, trace_engine), so on CI, where the fonts always win the race over loopback, all 120 KB are replayed on the slow 4G link before LCP: about the 0.6 s between the simulated FCP (about 2.0 s) and LCP. Locally some faces lost the race by chance (KI-043's spread). Only IBM Plex Sans 400 is needed for the largest paint (a product description)
- [x] Red first (`check-dist` `checkFirstViewFontFaces`, 4 tests; `npm run check:dist` red on `main`'s build, five faces named), then the fix: `src/styles/fonts-deferred.css` (5 faces), `tokens.css` keeps 2, `src/app/loadDeferredFonts.ts` (+5 tests) on `src/app/afterFirstPaint.ts` (shared with tracing), `main.tsx`; e2e `settleFonts` waits for `<html data-fonts>`; check-dist green on the fix's build (deferred CSS a chunk of its own, not in index.html)
- [x] Docs: performance.md section Fix KI-042 and KI-043, KNOWN_ISSUES (Fix in review), decisions x3, design-system/README.md loading rule
- [x] `npm ci && npm run verify` exit 0, **1111 tests** (90 files); shelf 3 files 128.4 KB
- [x] CI (run 40067163272, `9d3a759`): e2e green (visual specs included); perf: shelf **2.25 s**, LCP assertion passes; fonts before the observed LCP 2 (45.2 KB); product page 2.40 s; KI-042/043 Fixed (PR #55); performance.md "On CI" filled in
- [ ] CI's `image` (web KI-044: nginx 1.30.5 CVEs) and `verify` (web KI-045: npm audit, dev tooling) red, not caused by this PR: recorded, commented on the PR, a fix PR needs the owner's approval

## Next action
STOP: ask the owner to approve `fix/ki-044-045-<slug>` (base image `nginx:1.30.6-alpine-slim@sha256:d9322bba63c6cfc63dc9e86522fd4f95fd4d9020a02b5bced282bbf38b8c3960`; the three dev-tool advisories). After that fix merges: merge `main` into this branch, CI green, take PR #55 out of draft with the review report.

## ⚠️ Environment notes (this machine)
- Cloud containers differ per session (not the owner's WSL machine). On 2026-10-21: no Node 24 installed (Node 24.21.0 downloaded from nodejs.org into a scratch folder), no Docker, no `ecomdemo-backend-readonly` clone; the backend repository was checked out separately for the backend team's own task.
- Tag pushes are refused here with 403: tags are given to the owner as commands.
- Backend images cannot be built here (Docker build containers have no network), so the stack cannot start in this container.

## ⚠️ Carried, not fixed (oldest first)
- Tag `ki-020-fixed` is not pushed: the owner runs `git tag ki-020-fixed 1f584e6 && git push origin ki-020-fixed`.
- Not on `origin` either (checked 2026-10-11 with `git ls-remote --tags`): `phase-25-complete` (`57fecf0`) and `ki-038-fixed` (`dbd1ba0`): the owner runs `git tag phase-25-complete 57fecf0 && git tag ki-038-fixed dbd1ba0 && git push origin phase-25-complete ki-038-fixed`.
- Tag `ki-032-fixed` (`f86e750`): the owner runs `git tag ki-032-fixed f86e750 && git push origin ki-032-fixed` (check with `git ls-remote --tags origin` first).
- Tags `ki-039-fixed` and `ki-040-fixed` (`d486b76`, PR #48): the owner runs `git tag ki-039-fixed d486b76 && git tag ki-040-fixed d486b76 && git push origin ki-039-fixed ki-040-fixed`.
- Tag `ki-027-fixed` (`de40aaf`, PR #49): the owner runs `git tag ki-027-fixed de40aaf && git push origin ki-027-fixed`.
