# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-24
- **Task:** Fix KI-044 + KI-045 together (one cause: new HIGH advisories make CI red on every PR; approved by the owner 2026-10-24, "One fix PR for both", as a High interruption while draft PR #55, fix KI-042/043, waits). KI-044: `nginx` 1.30.5-r1 in the serving image (3 CVEs, fixed in 1.30.6). KI-045: `npm run audit:deps`, three dev-tooling advisories (body-parser, undici, zod 3 under Lighthouse CI)
- **Branch:** `fix/ki-044-045-ci-advisories` (cut from `main` at `ddd09c3`). PR #55 (`fix/ki-042-043-shelf-lcp`) stays open as a draft: proven on CI (shelf 2.25 s), red only on these two
- **Step:** IMPLEMENTING
- **Backend pinned at:** commit `a85202fefc0e1390f63bda4c93ce85c3b8266f60` (unchanged)
- **Waiting for user:** no

## Checklist
- [x] KI-044 and KI-045 In progress
- [x] Reproduce: `npm run audit:deps` red locally (the three advisories); CI's `image` job red on `nginx` 1.30.5-r1 (PR #55 run 40067163272; no Docker here, so the image scan only runs in CI)
- [ ] KI-044: `FROM nginx:1.30.6-alpine-slim@sha256:d9322bba63c6cfc63dc9e86522fd4f95fd4d9020a02b5bced282bbf38b8c3960`
- [ ] KI-045: body-parser 1.20.9 and undici 8.12.x (jsdom 30.1.3) in the lockfile; zod 3 under chromium-bidi: no fixed version reachable (`@lhci/cli` 0.15.1 is the latest, pins lighthouse 12.6.1) -> an `audit-allowlist.json` entry with its reason and an expiry
- [ ] `npm ci && npm run verify`, `npm run audit:deps` green; docs; PR; CI green (`image`, `verify`, `e2e`)
- [ ] After the merge: merge-verify, tags `ki-044-fixed`, `ki-045-fixed` (for the owner); then `main` into PR #55, CI green, #55 out of draft

## Next action
Bump the nginx base image in `Dockerfile`; update the lockfile for body-parser and jsdom/undici; add the zod allowlist entry; `npm run audit:deps` and `npm run verify`.

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
