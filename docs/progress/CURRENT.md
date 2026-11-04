# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-11-04
- **Task:** Fix KI-046 (`e2e/shelf.spec.ts`'s `pages` block stubs the product list but not the product reads, so a hovered stub card's prefetch asks the live backend for a stub id, gets `404`, and the console guard fails the test). Asked by the owner 2026-11-04 ("Continue" after the pin chore). `docs/KNOWN_ISSUES.md` row KI-046
- **Branch:** `fix/ki-046-shelf-stub-prefetch` (cut from `main` at `94b7c95`, the merge of PR #61)
- **Step:** IN_PROGRESS: pre-flight done
- **Backend pinned at:** commit `fd278e7b9b74cfc5b7e9542197598d9f9686201c` (backend PR #111, the KI-081 merge)
- **Waiting for user:** no

## Checklist
- [x] Pre-flight: chore pin (PR #61) merged as `94b7c95` and merge-verified: local `npm ci && npm run verify` on `main` exit 0, **1111 tests** (90 files); CI on `main` green (`image`, `publish`). A chore has no tag. Before it: backend PR #111 (KI-081, the fix for KI-041) merged as `fd278e7`
- [ ] Red first: a test in the `pages` block hovers a stub card (the prefetch reaches the backend: `404`, console guard red), deterministic on any browser
- [ ] Fix: the block also answers the stub products' reads (`/api/products/{id}`), as `screens.ts` does for its list
- [ ] `npx playwright test e2e/shelf.spec.ts` green against the stack at `fd278e7`; full `npm run e2e` once; `npm ci && npm run verify`
- [ ] Docs: KNOWN_ISSUES (Fixed); PR; CI green; STOP for review

## Next action
Bring the backend stack up at `fd278e7` (images from host jars, see the environment notes; `NO_REBUILD=1 bash scripts/backend-stack.sh up`), then write the red test in `e2e/shelf.spec.ts`.

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
