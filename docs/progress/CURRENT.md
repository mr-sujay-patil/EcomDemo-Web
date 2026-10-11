# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-11
- **Task:** Fix KI-032: a 5xx reference the gateway answered itself (catalogue down, `/fallback/catalog`) finds the gateway's log line in Loki and the trace in Tempo, now that backend KI-035 is fixed (backend PR #94, merge `a85202fefc0e1390f63bda4c93ce85c3b8266f60`). `docs/KNOWN_ISSUES.md` row KI-032 (Backend gaps table); Phase 23 Done-when: "the reference finds the gateway's log line and the trace"
- **Branch:** `fix/ki-032-gateway-reference` (cut from `main` at `dbd1ba0`, the merge of PR #46; KI-038 merged and merge-verified there)
- **Step:** PR_OPEN (PR #47)
- **Backend pinned at:** commit `a85202fefc0e1390f63bda4c93ce85c3b8266f60` (backend PR #94, KI-035; moved from `669a9ed` in `d16a81f`)
- **Waiting for user:** YES: CI on PR #47, then the owner's review and `approved, merge it`

## Checklist
- [x] Pre-flight: KI-038 merged (`dbd1ba0`) and merge-verified; branch cut; KI-032 In progress
- [x] Pin moved to `a85202f` everywhere it is written; delta since `669a9ed` checked: no controller, DTO, route, OpenAPI, compose, Dockerfile or application config change (`git diff`; `api:check` live only in CI)
- [x] Regression check: the real service-down spec finds both references' gateway line in Loki and trace in Tempo (`span.correlation_id`); `scripts/observability.ts` unit-tested (20). Not runnable here (backend build has no network from Docker builds)
- [x] `docs/troubleshooting.md` Path 2 rewritten (Loki and TraceQL by the reference; the derived link); Phase 23 test report note
- [x] Decisions `[Fix KI-032]` x3; KI-032 Fixed (PR #47); KI-039 recorded (Alloy keeps project `ecomdemo` only); development-environment pin row
- [x] Full `npm ci && npm run verify` exit 0 (1034 tests, 84 files); e2e/perf/`api:check` only in CI (no backend buildable here); `e2e:service-down` not run (owner, with the Alloy override)
- [x] PR opened (#47)
- [ ] CI green on the PR

## Next action
Wait for CI on PR #47 and fix it if red (first run at the new pin builds the backend from source unless cached). Ask the owner to confirm the repo variable `BACKEND_TAG` is unset. Then STOP for `approved, merge it`. After the merge: local `npm ci && npm run verify` on `main`, CI on `main` green, tag `ki-032-fixed` (give the owner `git tag ki-032-fixed <merge sha> && git push origin ki-032-fixed`; tag pushes are refused here).

## ⚠️ Environment notes (this machine)
- This session runs in a cloud container (not the owner's WSL machine): Node 24 at `/opt/node24/bin`; the backend team's working copy is `/home/user/ecomdemo` (read only, never checked out or changed); a read-only clone for this fix is at `/home/user/ecomdemo-backend-readonly` (`a85202f`, push URL `no-push`).
- Tag pushes are refused here with 403: tags are given to the owner as commands.

## ⚠️ Carried, not fixed (oldest first)
- Tag `ki-020-fixed` is not pushed: the owner runs `git tag ki-020-fixed 1f584e6 && git push origin ki-020-fixed`.
- Not on `origin` either (checked 2026-10-11 with `git ls-remote --tags`): `phase-25-complete` (`57fecf0`) and `ki-038-fixed` (`dbd1ba0`): the owner runs `git tag phase-25-complete 57fecf0 && git tag ki-038-fixed dbd1ba0 && git push origin phase-25-complete ki-038-fixed`.
