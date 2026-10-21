# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-21
- **Task:** Follow-up to fix KI-043 (PR #51, merged 2026-10-16 as `411548d` before its CI numbers were written in). Merge verification on `main` (`bd74ad3`): local `npm ci && npm run verify` exit 0, **1097 tests** (88 files); CI on `main` green (run 38829472884). But PR #51's CI perf run (38627692879) measured the shelf at **2.72 s** (2.72, 2.57, 2.74; 1.85x), over 2.5 s: KI-043 and KI-042 stay **Open**, no `ki-043-fixed` tag. The owner said 2026-10-21 to go with the recommended approach: record the verdict in a follow-up PR from the same branch (execution protocol, section 5)
- **Branch:** `fix/ki-043-body-font-swap` (fast-forwarded to `main` at `bd74ad3`)
- **Step:** IMPLEMENTING (docs only)
- **Backend pinned at:** commit `a85202fefc0e1390f63bda4c93ce85c3b8266f60` (unchanged)
- **Waiting for user:** no

## Checklist
- [x] Merge verification of PR #51: branch tip `72eb256` in `main`; local verify on `main` green; CI on `main` green
- [x] Read PR #51's CI perf numbers (job 116071601400): shelf 2.72 s, FCP 2.03 s, render delay 2268 ms; product page 2.44 s; Performance 94 / 96; slowdown 1.85x (index 2033), phones 1106 to 1262
- [x] Docs: `docs/performance.md` "On CI" and "What is left"; KI-043 and KI-042 rows (Open); decisions `[Fix KI-043]` (verdict recorded, preload kept)
- [ ] Push, PR to `main` (docs only; perf skipped locally: no code change); CI green; add its own perf numbers as a second sample
- [ ] STOP for review; after the merge: merge verification only (no tag: nothing is Fixed)

## Next action
Push `fix/ki-043-body-font-swap`, open the PR "Fix KI-043 (follow-up): record CI's verdict, KI-043 and KI-042 stay open", wait for its CI, add its perf job's shelf and product numbers to the PR description as a second sample of the same code, then STOP for `approved, merge it`. Proposed next step for KI-042/043 (owner to decide): download that run's `performance` artifact and read the shelf's Lighthouse trace to see why the products are not in CI's first paint.

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
