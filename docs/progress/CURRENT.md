# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-14
- **Task:** Fix KI-043 (approved by the owner 2026-10-14: "KI-043 font swap"): the shelf's LCP element (a product description) is sometimes drawn in the fallback font and again in IBM Plex Sans; Chrome counts the redraw as the LCP (2.73 to 2.88 s in 3 local runs of 10; CI median 2.64 s, runs 2.33, 2.79, 2.64; budget 2.5 s). `docs/KNOWN_ISSUES.md` row KI-043 (Fix queue), `docs/performance.md`
- **Branch:** `fix/ki-043-body-font-swap` (cut from `main` at `f3e42bf`, the merge of PR #50; KI-042 merged and merge-verified there: local verify 1092 tests, CI on `main` green). KI-042 stays **Open** (improved by PR #50, not fixed; no tag)
- **Step:** TESTING
- **Backend pinned at:** commit `a85202fefc0e1390f63bda4c93ce85c3b8266f60` (unchanged by this fix)
- **Waiting for user:** no

## Checklist
- [x] Pre-flight: KI-042 merged (`f3e42bf`) and merge-verified; branch cut; KI-043 In progress
- [x] Measure: 7 faces, all `swap`, hashed into `/assets/` (immutable); only Newsreader 600 preloaded; CSP `font-src 'self'`. Cause (not the guessed double paint): Lighthouse's simulation replays every request that ended before the observed LCP; faces asked for after React's render land there by chance and are simulated after the JS chain. Tools: scratchpad `ki043/`
- [x] Choose: 10 runs each (stand-in with the seed's SVG photos, 1.88x): shelf `main` 2.16 s (1.85 to 2.76), +Plex Sans 400 2.16 s (2.13 to 2.20), +400 and 600 2.15 s (2.11 to 2.61); product page 2.50 / 2.41 / 2.56 s; all six faces 2.60 s shelf, 3.25 s product (worse). Chosen: preload Plex Sans 400 only
- [x] Red `033d815` (check-dist `checkFontPreloads`: 5 unit tests red without it; `check:dist` red on main's index.html) → fix `2d0c42b` (index.html preload; e2e design.spec "fonts": the two faces, each fetched once)
- [ ] Tests: `npm ci && npm run verify` (running); the fix's own build measured again with Lighthouse (10 runs); e2e `design.spec.ts` fonts against the nginx image + stand-in
- [x] Docs: KI-043 (fix in review, CI placeholders), KI-042 pointer, `docs/performance.md` KI-043 section, decisions `[Fix KI-043]` x3, `design-system/README.md` (loading rule)
- [ ] PR opened; CI numbers filled in (Fixed only if CI shows the shelf under 2.5 s)

## Next action
Finish testing: read `npm run verify`'s result (scratchpad `ki043/verify.log`), measure `ki043/distFix` (the fix's build) with `measure.sh` (PAGES=/,/products/1, 1.88x, 10 runs) and run e2e design.spec "fonts" against it; then open the PR (`Fix KI-043: ...`), replace `PR_NUMBER` in docs/KNOWN_ISSUES.md, set the step to PR_OPEN, commit, push, STOP.

## ⚠️ Environment notes (this machine)
- This session runs in a cloud container (not the owner's WSL machine): Node 24 at `/opt/node24/bin`; the backend team's working copy is `/home/user/ecomdemo` (read only, never checked out or changed); a read-only clone is at `/home/user/ecomdemo-backend-readonly` (`a85202f`, push URL `no-push`).
- Tag pushes are refused here with 403: tags are given to the owner as commands.
- Backend images cannot be built here (Docker build containers have no network), so the stack cannot start in this container.

## ⚠️ Carried, not fixed (oldest first)
- Tag `ki-020-fixed` is not pushed: the owner runs `git tag ki-020-fixed 1f584e6 && git push origin ki-020-fixed`.
- Not on `origin` either (checked 2026-10-11 with `git ls-remote --tags`): `phase-25-complete` (`57fecf0`) and `ki-038-fixed` (`dbd1ba0`): the owner runs `git tag phase-25-complete 57fecf0 && git tag ki-038-fixed dbd1ba0 && git push origin phase-25-complete ki-038-fixed`.
- Tag `ki-032-fixed` (`f86e750`): the owner runs `git tag ki-032-fixed f86e750 && git push origin ki-032-fixed` (check with `git ls-remote --tags origin` first).
- Tags `ki-039-fixed` and `ki-040-fixed` (`d486b76`, PR #48): the owner runs `git tag ki-039-fixed d486b76 && git tag ki-040-fixed d486b76 && git push origin ki-039-fixed ki-040-fixed`.
- Tag `ki-027-fixed` (`de40aaf`, PR #49): the owner runs `git tag ki-027-fixed de40aaf && git push origin ki-027-fixed`.
