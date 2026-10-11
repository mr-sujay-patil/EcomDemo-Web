# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-11
- **Task:** Fix KI-039 (web side, approved by the owner 2026-10-11: "KI-039 web-side"): Loki gets no logs from this repo's backend stacks, because the backend's Alloy keeps only the compose project `ecomdemo`. This repo applies the Alloy override itself (`scripts/backend-stack.sh`, and CI through the same script), generated at stack start from the pinned backend's own `docker/alloy/config.alloy`, failing loudly if its project rule is not found; then the KI-032 check (`npm run e2e:service-down`) can run, in CI too. `docs/KNOWN_ISSUES.md` row KI-039 (Fix queue)
- **Branch:** `fix/ki-039-backend-logs-to-loki` (cut from `main` at `f86e750`, the merge of PR #47; KI-032 merged and merge-verified there: local verify 1034 tests, CI on `main` green)
- **Step:** TESTING
- **Backend pinned at:** commit `a85202fefc0e1390f63bda4c93ce85c3b8266f60` (unchanged by this fix)
- **Waiting for user:** no

## Checklist
- [x] Pre-flight: KI-032 merged (`f86e750`) and merge-verified; branch cut; KI-039 moved to the Fix queue, In progress
- [x] Regression test first (red, `75a260d`): `scripts/alloy-override.test.ts` on the pinned file (`scripts/fixtures/backend-config.alloy`); no-op stub: 12 of 14 failed
- [x] Generator `scripts/alloy-override.mjs` + `scripts/backend-stack.sh` mounts `.local/backend-stack/config.alloy` over Alloy's config (`dd30c79`; 14 of 14 pass). Real check here: Loki + Alloy from the pinned compose and a fake `gateway-service` container: 0 lines with the backend's config, 134 with the generated one
- [x] CI (`3659f08`): stack through `scripts/backend-stack.sh` (`STACK_PREFIX=ecomdemo PORT_SHIFT=0`, `NO_REBUILD=1` on a cache hit), Loki gateway-line check after e2e, `npm run e2e:service-down` after perf
- [x] Docs: `docs/troubleshooting.md`, `docs/process/development-environment.md`, decisions `[Fix KI-039]` x4, KI-039 Fixed (PR number pending), KI-032 note, spec hint
- [ ] Full `npm ci && npm run verify`
- [ ] PR opened

## Next action
Run the full `npm ci && npm run verify` (background), then push and open the PR `Fix KI-039: …`; put its number in KI-039's status (replace `PR #PENDING`) and set Step PR_OPEN.

## ⚠️ Environment notes (this machine)
- This session runs in a cloud container (not the owner's WSL machine): Node 24 at `/opt/node24/bin`; the backend team's working copy is `/home/user/ecomdemo` (read only, never checked out or changed); a read-only clone is at `/home/user/ecomdemo-backend-readonly` (`a85202f`, push URL `no-push`).
- Tag pushes are refused here with 403: tags are given to the owner as commands.
- Backend images cannot be built here (Docker build containers have no network), so the stack cannot start in this container.

## ⚠️ Carried, not fixed (oldest first)
- Tag `ki-020-fixed` is not pushed: the owner runs `git tag ki-020-fixed 1f584e6 && git push origin ki-020-fixed`.
- Not on `origin` either (checked 2026-10-11 with `git ls-remote --tags`): `phase-25-complete` (`57fecf0`) and `ki-038-fixed` (`dbd1ba0`): the owner runs `git tag phase-25-complete 57fecf0 && git tag ki-038-fixed dbd1ba0 && git push origin phase-25-complete ki-038-fixed`.
- Tag `ki-032-fixed` (`f86e750`): the owner runs `git tag ki-032-fixed f86e750 && git push origin ki-032-fixed` (check with `git ls-remote --tags origin` first).
