# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-11-04
- **Task:** Chore: move the backend pin from `a85202f` to backend `main` `f68f00b` (backend PR #108); asked by the owner 2026-11-04 ("Continue on web app, refer actual ecomdemo repo", then "Move pin to backend main")
- **Branch:** `chore/pin-backend-f68f00b` (cut from `main` at `8ca46be`, the merge of PR #55)
- **Step:** PR_OPEN (PR #61): waiting for CI (e2e and perf on the pinned browser decide)
- **Backend pinned at:** commit `a85202fefc0e1390f63bda4c93ce85c3b8266f60` (moving to `f68f00bb1934d91b4acaa401e37b44291d20614b` on this branch)
- **Waiting for user:** no

## Checklist
- [x] Pre-flight: PR #55 (fix KI-042 + KI-043) merged as `8ca46be` and merge-verified: local `npm ci && npm run verify` on `main` exit 0, **1111 tests** (90 files); CI on `main` green (run of 2026-10-31). Tags `ki-042-fixed`, `ki-043-fixed` (`8ca46be`) are the owner's (403 here)
- [x] Backend delta `a85202f..f68f00b` (10 PRs: KI-069, 070, 071, Phase 37, KI-074/075, lz4 1.12.0, KI-077, 078, 080, KI-076/079): no controller, DTO, route, OpenAPI, compose, Alloy or application config change; `src/main` only the catalog cache (KI-074/075); the Dockerfile adds `apk upgrade` (KI-077); k8s manifests change (Phase 37 Redis ACL users, KI-076 certificate reload)
- [x] Pin moved in `ci.yml`, `backend-images.yml`, README, development-environment.md, decisions (`33b4434`); `../ecomdemo-backend-readonly` checked out at `f68f00b`
- [x] `npm run api:check` against the stack at `f68f00b` (`http://localhost:28080`, all eight services on images built from that commit): "matches all 5 snapshots"
- [x] Full `npm run e2e` against the stack at `f68f00b`: **1011 passed**, 34 failed, 1 skipped (9.4 min). None is caused by the pin: 32 are `visual.spec.ts` pixel comparisons (1-2 % of pixels, sign-in included, which shows no backend data: this container's Chromium 141, not the build 1248 that Playwright 1.64 pins and CI runs); `catalog.spec.ts:150` misses one `response` event for the photo (both URLs answer 200 from the gateway; fails 2 of 3 alone, same browser cause); `shelf.spec.ts:134` is new **KI-046** (a stubbed shelf's hover prefetch asks the live backend for a stub id, 404; traced). CI's e2e, with the pinned browser, is the deciding run
- [x] `npm run perf`: **not runnable here** (the web image's `apk upgrade pcre2` needs network in `docker build`); CI runs perf on every PR
- [x] `npm ci && npm run verify` exit 0, **1111 tests** (90 files); PR #61 open
- [ ] CI green on PR #61 (check the e2e log's "Backend: … tag …" line names `f68f00b`: a repository variable `BACKEND_TAG` would override the default, and this proxy cannot read variables); STOP for review

## Next action
Wait for CI on PR #61. Green: STOP for `approved, merge it`. Red: fix what is this PR's; a failure from the browser or KI-046 locally is not proof of anything on CI.

## ⚠️ Environment notes (this machine)
- Cloud containers differ per session (not the owner's WSL machine). On 2026-10-21: no Node 24 installed (Node 24.21.0 downloaded from nodejs.org into a scratch folder), no Docker, no `ecomdemo-backend-readonly` clone; the backend repository was checked out separately for the backend team's own task.
- Tag pushes are refused here with 403: tags are given to the owner as commands.
- Playwright 1.64 wants Chromium build 1248; this container has 1194 (Chromium 141) in `/opt/pw-browsers`. Used 2026-11-04 without `playwright install`: `PLAYWRIGHT_BROWSERS_PATH` set to a scratch folder whose `chromium_headless_shell-1248/chrome-headless-shell-linux64/` and `chromium-1248/chrome-linux64/` link each file of the 1194 folders (plus `chrome-headless-shell` -> `headless_shell`). Visual specs then differ by 1-2 % of pixels: judge them on CI.
- The web image cannot be built here either (`apk upgrade pcre2` in `Dockerfile` needs network), so `npm run perf` and `e2e:docker` run only on CI.
- Backend images cannot be built with `docker build` here (its containers have no network for Maven). Workaround used 2026-11-04: `./mvnw -B package -DskipTests` on the host in a scratch copy of the clone, each jar's layers extracted and copied into `eclipse-temurin:21-jre-alpine` under the compose image names (no `apk upgrade`, which needs network), then `NO_REBUILD=1`. Touch the extracted files first: BuildKit keeps a context file whose size and mtime match its last transfer, and reproducible jars share one timestamp (the catalogue image got the payment service's same-length manifest).

## ⚠️ Carried, not fixed (oldest first)
- Tag `ki-020-fixed` is not pushed: the owner runs `git tag ki-020-fixed 1f584e6 && git push origin ki-020-fixed`.
- Not on `origin` either (checked 2026-10-11 with `git ls-remote --tags`): `phase-25-complete` (`57fecf0`) and `ki-038-fixed` (`dbd1ba0`): the owner runs `git tag phase-25-complete 57fecf0 && git tag ki-038-fixed dbd1ba0 && git push origin phase-25-complete ki-038-fixed`.
- Tag `ki-032-fixed` (`f86e750`): the owner runs `git tag ki-032-fixed f86e750 && git push origin ki-032-fixed` (check with `git ls-remote --tags origin` first).
- Tags `ki-039-fixed` and `ki-040-fixed` (`d486b76`, PR #48): the owner runs `git tag ki-039-fixed d486b76 && git tag ki-040-fixed d486b76 && git push origin ki-039-fixed ki-040-fixed`.
- Tag `ki-027-fixed` (`de40aaf`, PR #49): the owner runs `git tag ki-027-fixed de40aaf && git push origin ki-027-fixed`.
