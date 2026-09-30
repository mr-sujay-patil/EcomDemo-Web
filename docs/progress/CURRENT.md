# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-09-30
- **Phase:** 0 — Repository Bootstrap
- **Branch:** `main` (bootstrap commit only)
- **Step:** WAITING_FOR_USER
  (NOT_STARTED | PREFLIGHT | BRANCHED | PLANNING | IMPLEMENTING | TESTING | PR_OPEN | VERIFYING | WAITING_FOR_USER)
- **PR:** — (Phase 0 has no PR; it ends with tag `phase-00-complete`)
- **Backend pinned at:** `ki-001-fixed` (read-only clone `../ecomdemo-backend-readonly`)
- **Waiting for user:** YES: GitHub settings + backend clone `.env` (phase file, "Your manual steps"), then `done`

## Merge verification before this phase
Not applicable (first phase).

## Design (decided; decisions.md entries to write)
- Repository is **public** (user's choice, matches the backend; free branch protection).
- `*:Zone.Identifier` (Windows download metadata) is gitignored as an OS file.
- Root `ecomdemo-frontend-integration-guide.md` (identical to `docs/backend/integration-guide.md`) left untracked (user's choice).

## Checklist (from the phase file's "What you'll implement")
- [x] `git init -b main`; repo-local identity `sujaysp`
- [x] Read-only clone at `ki-001-fixed`, push URL `no-push`; push fails locally (shown)
- [x] README, `.gitignore`, `.env.example`, `.gitattributes`, PR template
- [x] Initial commit `chore: bootstrap repository and roadmap`
- [x] `gh repo create EcomDemo-Web --public --source . --push`
- [ ] User: GitHub settings + backend clone `.env` → `done`
- [ ] Verify via `gh api` (merge settings, protection with `enforce_admins: true`); direct push to `main` rejected (shown)
- [ ] Backend stack up; `curl -s localhost:8080/api/products` → 200
- [ ] Tag `phase-00-complete` pushed; short report

## Next action
Wait for the user's `done`. Then, in `~/projects/ecomdemo-web` (no new commits on `main`): run the `gh api` checks, prove a direct push to `main` is rejected using a dangling commit object, so no branch or local commit is created (`sha=$(git commit-tree HEAD^{tree} -p HEAD -m "protection test")`, then `git push origin $sha:refs/heads/main` must be rejected), start the backend from the read-only clone if the gateway isn't running, curl `/api/products`, then `git tag -a phase-00-complete` and push the tag. Any checkpoint change after this commit goes onto Phase 1's branch.

## ⚠️ Environment notes (this machine)
- One backend stack at a time: if `ecomdemo-gateway-service` is running, use it.
- The repo folder is `~/projects/ecomdemo-web` (lowercase), not `~/projects/EcomDemo-Web` as the docs say; relative paths (`../ecomdemo-backend-readonly`) still work.
- Node.js is **not installed inside WSL** (`npm` resolves to the Windows install under `/mnt/c`). Phase 1 needs Node LTS through `nvm` inside WSL (user's manual step).

## ⚠️ Carried, not fixed (oldest first)
- 
