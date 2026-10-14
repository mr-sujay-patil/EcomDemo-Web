# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-14
- **Task:** Fix KI-043 (approved by the owner 2026-10-14: "KI-043 font swap"): the shelf's LCP element (a product description) is sometimes drawn in the fallback font and again in IBM Plex Sans; Chrome counts the redraw as the LCP (2.73 to 2.88 s in 3 local runs of 10; CI median 2.64 s, runs 2.33, 2.79, 2.64; budget 2.5 s). `docs/KNOWN_ISSUES.md` row KI-043 (Fix queue), `docs/performance.md`
- **Branch:** `fix/ki-043-body-font-swap` (cut from `main` at `f3e42bf`, the merge of PR #50; KI-042 merged and merge-verified there: local verify 1092 tests, CI on `main` green). KI-042 stays **Open** (improved by PR #50, not fixed; no tag)
- **Step:** IMPLEMENTING (measuring)
- **Backend pinned at:** commit `a85202fefc0e1390f63bda4c93ce85c3b8266f60` (unchanged by this fix)
- **Waiting for user:** no

## Checklist
- [x] Pre-flight: KI-042 merged (`f3e42bf`) and merge-verified; branch cut; KI-043 In progress
- [ ] Measure (in progress). Found so far: 7 faces in `src/styles/tokens.css`, all `font-display: swap`, hashed by Vite into `/assets/` (immutable, no security headers, `etag off`); index.html preloads only Newsreader SemiBold (Vite rewrites its `/src/styles/fonts/...` href to the hashed name); CSP `font-src 'self'`. Shelf (stand-in, nginx image, 1.88x, 10 runs) `main` median 2.33 s (1.85 to 2.77). **The cause is not the Plex swap as KI-043 guessed:** Lantern (Lighthouse's simulation) counts every request that ENDED before the observed LCP; the shelf's fonts other than the preloaded one are discovered only when React has rendered, so whichever of them land before the products' paint are simulated after the whole JS chain (Plex Sans R+SB: ~2.3 s; plus Mono R+M and Newsreader Medium: 2.6 to 2.8 s). Delaying Plex Sans in a browser makes the fallback paint count (larger), not a later entry. Preload Plex Sans R (V1): median 2.21 s; R+SB (V2): 2.14 s (2.11 to 2.86; the outliers now have Mono + Newsreader Medium before the paint). Running: main/V2/V3 (all six shelf faces) on `/` and `/products/1` with a stand-in photo (78 KB). Tools: scratchpad `ki043/` (measure.sh, standin.mjs with PHOTO, summ.mjs, reqs.mjs, el.mjs, race.mjs, layout.mjs)
- [ ] Choose the fix (preload the body face / `font-display: optional` / metric-matched fallback), red test first, implement
- [ ] Tests: `npm run verify` (visual baselines unchanged unless the rendering legitimately changes); local Lighthouse after
- [ ] Docs: KI-043 (and KI-042) status, `docs/performance.md`, `design-system/README.md` if the font rule changes, decisions `[Fix KI-043]`
- [ ] PR opened; CI numbers filled in (Fixed only if CI shows the shelf under 2.5 s)

## Next action
Read the main/V2/V3 results (scratchpad `ki043/m-p*.log`, `reqs-p*.txt`), pick the preload set (product page must not get worse), write the red check-dist test (font preloads point at emitted files, CSP font-src 'self', the chosen faces preloaded), then change index.html.

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
