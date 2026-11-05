# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-11-05
- **Task:** Chore: Dependabot PR #64 (20 npm updates) fails `npm ci` with ERESOLVE: OpenTelemetry JS 3.0 needs `api` 1.10 and deprecated `sdk-trace-web`, which allows only `api` < 1.10. Move tracing to `@opentelemetry/sdk-trace` 3.0.0 and take the group's other 19 updates, so this PR replaces #64. The owner asked "Continue on web" (2026-11-05) on my best recommendation
- **Branch:** `chore/deps-opentelemetry-3` (cut from `main` at `2820383`, the merge of PR #67)
- **Step:** IN_PROGRESS: change made, verify green; e2e against the stack next
- **Backend pinned at:** commit `fd278e7b9b74cfc5b7e9542197598d9f9686201c` (backend PR #111)
- **Waiting for user:** no

## Checklist
- [x] Pre-flight: chore PR #67 (backend-gap re-check) merged as `2820383` on the owner's `approved, merge it`, merge-verified (local verify 1111 tests, CI on `main` green). A chore has no tag
- [x] Cause (CI log of #64's `verify`): `npm ci` ERESOLVE, `@opentelemetry/sdk-trace-web@2.12.0` peer `api` `>=1.0.0 <1.10.0` against `api` 1.10.0 needed by `core` 3.0.0 (instrumentations 0.300.0); `sdk-trace-web` is deprecated for `@opentelemetry/sdk-trace` (npm, 2026-10-20)
- [x] Change (`44bbca6`): package.json (#64's 19 other versions; `sdk-trace` 3.0.0 for `sdk-trace-web`; `core` 3.0.0 direct), lockfile by `npm install`; `tracing.ts` sets the global provider, `StackContextManager` and the W3C propagators by hand
- [x] `npm ci` clean (no ERESOLVE); `tracing.test.ts` + `startTracing.test.ts` 10 of 10; `npm run verify` exit 0, 1111 tests, budgets: vendor 96.9 KB gzipped (limit 100), shelf 129.3 KB in 3 files
- [ ] e2e against the stack at `fd278e7`: `observability.spec.ts` (a browser trace continues through the gateway into Tempo), then the full `npm run e2e`
- [ ] Docs: decisions `[Chore deps OpenTelemetry 3]`; PR (perf on CI: the bundle changed); CI green; STOP for review

## Next action
With the stack up (`NO_REBUILD=1 bash scripts/backend-stack.sh up`), run `npx playwright test e2e/observability.spec.ts`, then `npm run e2e`; then open the PR.

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
