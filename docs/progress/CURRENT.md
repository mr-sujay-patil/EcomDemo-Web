# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-11-04
- **Task:** Fix KI-047 (`e2e/cart.spec.ts:35` reads the server's total from a `page.on('response')` listener whose `response.json()` can meet a body the browser has dropped: the rejection fails the test). Asked by the owner 2026-11-04 ("Continue" after PR #63). `docs/KNOWN_ISSUES.md` row KI-047
- **Branch:** `fix/ki-047-cart-total-listener` (cut from `main` at `3afbfbc`, the merge of PR #63)
- **Step:** PR_OPEN (PR #66): waiting for CI
- **Backend pinned at:** commit `fd278e7b9b74cfc5b7e9542197598d9f9686201c` (backend PR #111)
- **Waiting for user:** no

## Checklist
- [x] Pre-flight: fix KI-046 (PR #62) merged as `fcfcd36`, merge-verified (local verify 1111 tests, CI on `main` green); the owner's tag `ki-046-fixed`. Then the docs chore PR #63 (KI-030, KI-031 rows; conflict resolved by the other session as `52b85c3`, the same tree as this session's) merged as `3afbfbc` on the owner's `approved, merge it`, merge-verified the same way
- [x] Red, measured: `cart.spec.ts:35 --repeat-each=20 --retries=0` on `main`'s code: 1 failed (KI-047's `Protocol error (Network.getResponseBody)`), 19 passed
- [x] Fix (`b1d81df`): `serverCartTotal` in `e2e/live-data.ts` (signed in once, `GET /api/cart` at each call); the four polls compare the summary with it; the listener is gone
- [x] Green: the test 20 of 20, the spec 20 of 20 (`--repeat-each=10`); full `npm run e2e` 1014 passed, 32 failed (all `visual.spec.ts`, this container's browser); `npm ci && npm run verify` exit 0, 1111 tests
- [x] Docs: KNOWN_ISSUES KI-047 Fixed (PR #66); PR #66
- [ ] CI green on PR #66; STOP for review

## Next action
Wait for CI on PR #66. Green: STOP for `approved, merge it` (the owner's scheduled 3:10 am IST "upload, merge and continue" is not that phrase: report and wait). After the merge: merge-verify (local verify on `main`, CI on `main`), then the owner tags `ki-047-fixed`.

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
