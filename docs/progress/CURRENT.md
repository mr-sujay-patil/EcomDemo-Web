# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-11
- **Task:** Fix KI-042 (approved by the owner 2026-10-11: "KI-042 shelf LCP"): the shelf's LCP is 2.87 s on CI at the calibrated slowdown (budget 2.5 s, a warning); its JavaScript grew from 128 KB (Phase 21) to 159 KB. `docs/KNOWN_ISSUES.md` row KI-042 (Fix queue), `docs/performance.md`
- **Branch:** `fix/ki-042-shelf-lcp` (cut from `main` at `de40aaf`, the merge of PR #49; KI-027 merged and merge-verified there: local verify 1083 tests, CI on `main` green)
- **Step:** BRANCHED
- **Backend pinned at:** commit `a85202fefc0e1390f63bda4c93ce85c3b8266f60` (unchanged by this fix)
- **Waiting for user:** no

## Checklist
- [x] Pre-flight: KI-027 merged (`de40aaf`) and merge-verified; branch cut; KI-042 In progress
- [ ] Measure: what grew from 128 KB to 159 KB on the shelf's critical path, by module (bundle analysis, git history of the entry)
- [ ] Fix: code not needed for the shelf's first paint out of its initial chunks (behaviour identical); optionally the shelf's data from the inline script (CSP hash updated)
- [ ] Tests: red then green for anything new; a bundle assertion that the moved code is not in the shelf's initial chunks
- [ ] Full `npm ci && npm run verify`; local measurement against a stand-in API (no backend buildable here)
- [ ] Docs: KI-042 status (by the evidence), `docs/performance.md`, decisions `[Fix KI-042]`
- [ ] PR opened; CI numbers filled in afterwards

## Next action
Measure: `npm run perf:analyze` on `main`'s build and on Phase 21's (`git log` for the Phase 21 merge), list the shelf's initial chunks (entry + modulepreloads) and attribute the growth by module.

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
