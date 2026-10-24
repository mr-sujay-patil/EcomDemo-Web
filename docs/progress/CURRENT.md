# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-21
- **Task:** Fix KI-042 + KI-043 together (one cause: the shelf's LCP on CI, 2.72 s and 2.65 s in PRs #51 and #54, budget 2.5 s); approved by the owner 2026-10-21 ("Fix KI-042+043 together"). `docs/KNOWN_ISSUES.md` rows KI-042, KI-043; `docs/performance.md`
- **Branch:** `fix/ki-042-043-shelf-lcp` (cut from `main` at `ddd09c3`, the merge of PR #54; merge-verified: local verify 1097 tests, CI on `main` green)
- **Step:** TESTING
- **Backend pinned at:** commit `a85202fefc0e1390f63bda4c93ce85c3b8266f60` (unchanged)
- **Waiting for user:** no (the owner chose option 1, defer five faces, 2026-10-24)

## Checklist
- [x] Pre-flight: PR #54 merged and verified; branch cut; KI-042 and KI-043 In progress
- [x] Measure on CI: `scripts/perf-lcp-inputs.mjs` (5 unit tests) prints what each first run's simulated LCP is built from; draft PR #55 (CI only runs on PRs), run 39647266492 at `528ab3f`, all green
- [x] Cause (CI run 39647266492, shelf 2.55 s median: 2.55, 2.70, 2.55; product page under 2.5 s): the OBSERVED load is fast and the products are in the first paint (FCP 291 ms, LCP 336 ms, +45 ms; DOM 240 elements; the e2e-changed-catalogue hypothesis is out). 14 of 20 requests ended before the observed LCP, among them **all six font faces (119.9 KB)**: Lantern's LCP graph keeps every request that ended before the observed LCP except low-priority images (`LargestContentfulPaint.getOptimisticGraph`, trace_engine), so on CI, where the fonts always win the race over loopback, all 120 KB are replayed on the slow 4G link before LCP: about the 0.6 s between the simulated FCP (about 2.0 s) and LCP. Locally some faces lost the race by chance (KI-043's spread). Only IBM Plex Sans 400 is needed for the largest paint (a product description)
- [x] Red first (`check-dist` `checkFirstViewFontFaces`, 4 tests; `npm run check:dist` red on `main`'s build, five faces named), then the fix: `src/styles/fonts-deferred.css` (5 faces), `tokens.css` keeps 2, `src/app/loadDeferredFonts.ts` (+5 tests) on `src/app/afterFirstPaint.ts` (shared with tracing), `main.tsx`; e2e `settleFonts` waits for `<html data-fonts>`; check-dist green on the fix's build (deferred CSS a chunk of its own, not in index.html)
- [x] Docs: performance.md section Fix KI-042 and KI-043, KNOWN_ISSUES (Fix in review), decisions x3, design-system/README.md loading rule
- [ ] `npm ci && npm run verify`; push; CI's perf run: the shelf's median under 2.5 s and no font among the requests before the observed LCP except the two preloaded; then the PR out of draft; KI-042/043 Fixed only if under 2.5 s

## Next action
When `npm run verify` passes, commit the fix and docs, push, and read PR #55's perf run: "Before the observed LCP" must list fonts 2 (the preloaded) on the shelf, and the shelf's median must be under 2.5 s. Fill in performance.md "On CI", set KI-042/043 Fixed (PR #55) only if under 2.5 s, take the PR out of draft with the review report, and STOP.

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
