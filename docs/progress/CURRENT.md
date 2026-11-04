# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-11-04
- **Task:** Chore: move the backend pin from `a85202f` to backend `main` `f68f00b` (backend PR #108); asked by the owner 2026-11-04 ("Continue on web app, refer actual ecomdemo repo", then "Move pin to backend main")
- **Branch:** `chore/pin-backend-f68f00b` (cut from `main` at `8ca46be`, the merge of PR #55)
- **Step:** IN_PROGRESS: pre-flight done; backend delta read
- **Backend pinned at:** commit `a85202fefc0e1390f63bda4c93ce85c3b8266f60` (moving to `f68f00bd`)
- **Waiting for user:** no

## Checklist
- [x] Pre-flight: PR #55 (fix KI-042 + KI-043) merged as `8ca46be` and merge-verified: local `npm ci && npm run verify` on `main` exit 0, **1111 tests** (90 files); CI on `main` green (run of 2026-10-31). Tags `ki-042-fixed`, `ki-043-fixed` (`8ca46be`) are the owner's (403 here)
- [x] Backend delta `a85202f..f68f00b` (10 PRs: KI-069, 070, 071, Phase 37, KI-074/075, lz4 1.12.0, KI-077, 078, 080, KI-076/079): no controller, DTO, route, OpenAPI, compose, Alloy or application config change; `src/main` only the catalog cache (KI-074/075); the Dockerfile adds `apk upgrade` (KI-077); k8s manifests change (Phase 37 Redis ACL users, KI-076 certificate reload)
- [ ] Pin moved in `ci.yml`, `backend-images.yml`, README, development-environment.md, decisions; the read-only clone checked out at the new commit
- [ ] `npm run api:check` against the new backend's live OpenAPI documents: no drift
- [ ] Backend stack up at the new pin (`bash scripts/backend-stack.sh up`); full `npm run e2e` and `npm run perf` green against it
- [ ] `npm ci && npm run verify` exit 0; PR open; CI green; STOP for review

## Next action
Move the pin in the files above, check out `f68f00b` in `../ecomdemo-backend-readonly`, build its images (host Maven: Docker builds have no network here), start the stack, run `api:check`, e2e and perf.

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
