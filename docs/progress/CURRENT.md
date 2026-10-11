# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-11
- **Task:** Fix KI-032: a 5xx reference the gateway answered itself (catalogue down, `/fallback/catalog`) finds the gateway's log line in Loki and the trace in Tempo, now that backend KI-035 is fixed (backend PR #94, merge `a85202fefc0e1390f63bda4c93ce85c3b8266f60`). `docs/KNOWN_ISSUES.md` row KI-032 (Backend gaps table); Phase 23 Done-when: "the reference finds the gateway's log line and the trace"
- **Branch:** `fix/ki-032-gateway-reference` (cut from `main` at `dbd1ba0`, the merge of PR #46; KI-038 merged and merge-verified there)
- **Step:** BRANCHED
- **Backend pinned at:** commit `669a9ed1dfcc8ef0d89608c87ef05421bb157fb6`; this fix moves it to `a85202fefc0e1390f63bda4c93ce85c3b8266f60` (backend KI-035)
- **Waiting for user:** NO

## Checklist
- [x] Pre-flight: KI-038 merged (`dbd1ba0`) and merge-verified; branch cut; KI-032 In progress
- [ ] Pin moved to `a85202f` everywhere it is written; the delta since `669a9ed` checked for contract changes (controllers, DTOs, OpenAPI, compose)
- [ ] Regression check: the real service-down spec finds the on-screen reference's gateway line in Loki and its server span in Tempo (`span.correlation_id`); helpers unit-tested
- [ ] `docs/troubleshooting.md` Path 2 rewritten (Loki and TraceQL by the reference; the derived link); Phase 23 test report note
- [ ] Decisions `[Fix KI-032]`; KI-032 Fixed; development-environment pin row
- [ ] Full `npm ci && npm run verify`; e2e/perf (local if a backend stack can be built here, otherwise CI)
- [ ] PR opened

## Next action
Move the pin (`chore(backend): pin a85202f (backend KI-035)`): `.github/workflows/ci.yml`, `.github/workflows/backend-images.yml`, `README.md`, `docs/process/development-environment.md` (old pin into "Previous pins"), a `docs/decisions.md` line. Then the regression check in `e2e/observability.spec.ts` ("really stopped").

## ⚠️ Environment notes (this machine)
- This session runs in a cloud container (not the owner's WSL machine): Node 24 at `/opt/node24/bin`; the backend team's working copy is `/home/user/ecomdemo` (read only, never checked out or changed); a read-only clone for this fix is at `/home/user/ecomdemo-backend-readonly` (`a85202f`, push URL `no-push`).
- Tag pushes are refused here with 403: tags are given to the owner as commands.

## ⚠️ Carried, not fixed (oldest first)
- Tag `ki-020-fixed` is not pushed: the owner runs `git tag ki-020-fixed 1f584e6 && git push origin ki-020-fixed`.
- Not on `origin` either (checked 2026-10-11 with `git ls-remote --tags`): `phase-25-complete` (`57fecf0`) and `ki-038-fixed` (`dbd1ba0`): the owner runs `git tag phase-25-complete 57fecf0 && git tag ki-038-fixed dbd1ba0 && git push origin phase-25-complete ki-038-fixed`.
