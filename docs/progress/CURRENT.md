# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-11-09
- **Task:** Chore: pin backend `main` `92f04b1` (backend PR #119, after #118: the OpenAPI documents mark every response field required, a nullable object as `anyOf`, and fix `unitPrice`'s text: backend KI-084, 085, 086, 087), regenerate the types, and drop the two workarounds they make unnecessary (`assumeResponsePropertiesPresent`, web KI-016; the `PendingCartAddition | null` widening, web KI-021). The owner: "do the OpenAPI fixes" (2026-11-09)
- **Branch:** `chore/pin-backend-92f04b1` (cut from `main` at `5de3c62`, the merge of PR #59)
- **Step:** PR_OPEN: waiting for CI
- **Backend pinned at:** commit `fd278e7b9b74cfc5b7e9542197598d9f9686201c` on `main` (this branch: `92f04b17ef988312387a730224a3189cc2511f82`)
- **Waiting for user:** YES after CI is green: review (`approved, merge it`)

## Checklist
- [x] Pre-flight: PRs #68 (OpenTelemetry 3) and #59 (docker/login-action) merged and merge-verified (local verify 1111 tests, CI on `main` green); Dependabot closed #64. Backend PRs #118 and #119 merged (`2ac9cdf`, `92f04b1`) and merge-verified
- [x] Pin moved (ci.yml, backend-images.yml, README, development-environment.md); `../ecomdemo-backend-readonly` re-cloned at `92f04b1` with a fresh local `.env` (the container was reset; the five values generated as `.env.example` says, never printed)
- [x] Stack up at `92f04b1`; snapshots and types regenerated (`cbd1cdf`); the workarounds removed (`819e7cf`); the types differ only where more exact (six fields `| null`, `pendingAction | null`); `tsc` clean; `api:check` matches all 5
- [x] KNOWN_ISSUES: web KI-016, KI-019, KI-021 Fixed in the backend, pinned; decisions `[Chore pin 92f04b1]`; api-layer.md and modules/assistant.md
- [x] `npm run verify` exit 0, **1108 tests** (the 3 removed tested the deleted `assumeResponsePropertiesPresent`); `npm run e2e` against `92f04b1`: 1014 passed, 32 failed (all `visual.spec.ts`, this container's Chromium 153 build 1243, as on `main`)
- [ ] CI green (perf there); STOP for review

## Next action
Wait for CI on the PR. Green: STOP for `approved, merge it`. After the merge: merge-verify (local verify on `main`, CI on `main`). A chore has no tag.

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
