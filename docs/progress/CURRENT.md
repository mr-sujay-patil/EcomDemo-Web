# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-21
- **Task:** Fix KI-042 + KI-043 together (one cause: the shelf's LCP on CI, 2.72 s and 2.65 s in PRs #51 and #54, budget 2.5 s); approved by the owner 2026-10-21 ("Fix KI-042+043 together"). `docs/KNOWN_ISSUES.md` rows KI-042, KI-043; `docs/performance.md`
- **Branch:** `fix/ki-042-043-shelf-lcp` (cut from `main` at `ddd09c3`, the merge of PR #54; merge-verified: local verify 1097 tests, CI on `main` green)
- **Step:** IMPLEMENTING (measure first)
- **Backend pinned at:** commit `a85202fefc0e1390f63bda4c93ce85c3b8266f60` (unchanged)
- **Waiting for user:** no

## Checklist
- [x] Pre-flight: PR #54 merged and verified; branch cut; KI-042 and KI-043 In progress
- [ ] Measure on CI (local runs do not show it; no Docker here): the perf report prints, for each page's first run, the observed FCP and LCP, the requests that ended before the observed LCP (what Lighthouse's simulation replays for LCP), by type, and the DOM size. CI runs only on pull requests, so the PR is opened early, as a draft, to read it
- [ ] Find the cause from that output (hypothesis to check: on CI the shelf is measured after the whole e2e suite, against a catalogue it changed)
- [ ] Red test, then the fix
- [ ] Tests (`npm ci && npm run verify`), docs, PR ready for review; KI-042/043 Fixed only if CI shows the shelf under 2.5 s

## Next action
Add the LCP-inputs lines to `scripts/perf-report.mjs` (logic in `scripts/perf-lcp-inputs.mjs`, unit-tested), push, open the draft PR, and read the perf job's "Behind the numbers".

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
