# Current Checkpoint

> The single source of truth for **in-phase** (or in-fix) progress. Keep it under ~60 lines. Update and commit it at every step change and before every stop.

- **Updated:** 2026-10-11
- **Task:** Fix KI-038: triage the first SonarQube analysis's 144 maintainability findings rule by rule (fix, or accept with the reason in the code or `sonar-project.properties` and a `[Fix KI-038]` decision), `docs/KNOWN_ISSUES.md` row KI-038
- **Branch:** `fix/ki-038-sonar-findings` (cut from `main` at `57fecf0`, the merge of PR #45; Phase 25 merge-verified: local `npm ci && npm run verify` on `main` exit 0, 996 tests, and CI on `main` green, run 113; tag `phase-25-complete` for the owner to push, tag pushes are refused here with 403)
- **Step:** BRANCHED
- **Backend pinned at:** commit `669a9ed1dfcc8ef0d89608c87ef05421bb157fb6` (unchanged; this fix needs nothing from the backend)
- **Waiting for user:** no

## Checklist
- [x] Pre-flight: Phase 25 verified in `main`; branch cut; KI-038 moved to the fix queue (In progress)
- [ ] Baseline analysis of `57fecf0` on a fresh local SonarQube (expect 144 code smells)
- [ ] `S3776` cognitive complexity (5): ProductCard, SagaTimeline, ProductFormPage, SearchIndexPage, CartPage under 15, behaviour identical
- [ ] `S7773` `Number.NaN`
- [ ] `S6759` read-only props (51)
- [ ] `S1874` deprecated `FormEvent` (8) and `prefetchQuery` (1)
- [ ] `S3358` nested ternaries (29): fix or accept
- [ ] `S6819` ARIA role vs native element (28): fix or accept with the Phase 08/18 reasons
- [ ] `S5906`, `S3863`, `S4624` and the singles: fix or accept
- [ ] Re-analysis: before/after counts by rule, gate status; stack down
- [ ] Decisions `[Fix KI-038]`, KI-038 Fixed, full `npm ci && npm run verify`
- [ ] PR opened

## Next action
Run the baseline analysis (README "Code quality dashboard"; on this machine an uncommitted compose override puts `/opt/sonarqube/data/es9` on a tmpfs), then work the checklist top to bottom, one commit per rule group.

## ⚠️ Environment notes (this machine)
- The backend team's own stack (`~/projects/ecomdemo`, compose project `ecomdemo`) was running on 2026-10-06 and reported `phase-34-complete-2-g40fed61` (two commits past the tag). Its API matched the tag (snapshots differ only by `imageUrl` and the image path). Never stop or touch it; starting the clone's stack fails on the container names while it runs.
- One backend stack at a time: if `ecomdemo-gateway-service` is running, use it.
- The repo folder is `~/projects/ecomdemo-web` (lowercase), not `~/projects/EcomDemo-Web` as the docs say; relative paths still work.
- Node v24.21.0 via nvm in WSL, loaded only by interactive shells (`~/.bashrc`). Non-interactive commands must `. ~/.nvm/nvm.sh` first, or `npm` resolves to the Windows install under `/mnt/c`.
- Root `ecomdemo-frontend-integration-guide.md` is an untracked duplicate of `docs/backend/integration-guide.md` (owner's choice); leave it.
- Claude Code runs on Windows: run git/gh/npm in WSL. `wsl.exe -- bash -lc "…"` expands `$vars` in the outer shell first, so put multi-step commands in a script file and run `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash /mnt/c/…/script.sh` (Git Bash on the UNC path hits "dubious ownership"; `gh` is only in WSL). Redirect the script's output to a file in WSL and `cat` it, or lines get mangled. The Chrome extension blocks localhost: use headless Chrome (`--dump-dom`, `--enable-logging=stderr`).
- `~/.cache/ms-playwright` already holds `chromium-1243` and `chromium_headless_shell-1243`.

## ⚠️ Carried, not fixed (oldest first)
- The backend stack running here (`ecomdemo-gateway-service`) is ahead of the pin: `npm run e2e` stops at `api:check` (dead-letter admin schema `dltTimestamp`). Run `npx playwright test --project=chromium` and say so, or have the owner approve a `chore/pin-backend-<tag>`.
- Tag `ki-020-fixed` is not pushed (tag pushes are refused here with 403): the owner runs `git tag ki-020-fixed 1f584e6 && git push origin ki-020-fixed`.
