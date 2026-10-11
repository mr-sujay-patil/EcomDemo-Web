# Phase 25: Code Quality Dashboard (SonarQube)

| | |
|---|---|
| **Stage** | Stage 5: Quality (added after Stage 5, from candidate web KI-014) |
| **Technology** | SonarQube Community Build, self-hosted in Docker + the SonarScanner CLI (Docker image) |
| **Branch** | `feature/phase-25-sonarqube` |
| **PR title** | `Phase 25: Code Quality Dashboard (SonarQube)` |
| **Requires** | `phase-24-complete` on `main` (PR #44, merge `70d64f6`); backend: **none** |
| **Needs from the backend** | none. The backend's Phase 12 (`compose.sonar.yaml`, `scripts/sonar-setup.sh`, decisions `[Phase 12]`) is the design this phase mirrors, read from its clone; nothing in it changes |
| **Completion tag** | `phase-25-complete` |

> Approved by the user on 2026-10-11: "Code-quality dashboard (KI-014): self-hosted SonarQube Community, mirroring the backend's Phase 12. Not SonarQube Cloud, no CI gate, no account or repository secret."

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. The backend is read only (CLAUDE.md rule 10): its Sonar files are a reference, never edited, and its own Sonar stack (port 9000) is never started, stopped or used from here.

**Goal:** One command shows the shop's code health on a dashboard: bugs, vulnerabilities, security hotspots, code smells, duplication and test coverage, file by file, with a quality gate that judges every change by the code it adds. It runs on this machine, beside the backend team's own SonarQube, with nothing to sign up for and no secret in the repository.

**What you'll implement**
- `compose.sonar.yaml`: SonarQube Community (`sonarqube:26.9.0.129388-community`, the backend's pin) and its own PostgreSQL (an exact tag), as compose project `ecomdemo-web-sonar` with its own container names, volumes and host port (**127.0.0.1:9010**, loopback only), so it can run beside the backend team's Sonar (9000) and the backend stack the E2E uses (`scripts/backend-stack.sh`). The database is not published. A healthcheck waits for `"status":"UP"`, not just an open port.
- `scripts/sonar-setup.sh`: waits for SonarQube, takes the admin password from `SONAR_ADMIN_PASSWORD` (on a fresh server it changes the factory `admin`/`admin` to it), creates the project `ecomdemo-web` and the quality gate `EcomDemo Web way` with every condition on **new code** (the backend's six: coverage ≥ 80 %, no new issue, duplication ≤ 3 %, every hotspot reviewed, reliability A, security A), attaches it, and generates a **project analysis token** that it prints once with the line to export it as `SONAR_TOKEN`. Idempotent: a second run changes nothing but the token. No password or token is ever written to a file.
- `sonar-project.properties` and `npm run sonar`: sources `src/`, tests (`*.test.ts(x)`, `src/test/`) as tests, not sources; `src/api/generated/` and other generated or tool output excluded; coverage from Vitest's `coverage/lcov.info` (the `lcov` reporter added to `vite.config.ts`, thresholds unchanged). The scanner is the pinned `sonarsource/sonar-scanner-cli` Docker image, so no npm dependency is added; it waits for the quality gate and fails when the gate fails.
- A fast, stack-free test (`scripts/sonar.test.ts`) that reads the three files: pinned tags, loopback port and names that cannot collide with the backend's, no secret, generated code excluded, the gate's conditions on new code.
- README section, `[Phase 25]` decisions, the port in `docs/process/development-environment.md`.

**Concepts to understand**
- Static analysis versus tests: the analyser reads the code without running it and finds what tests rarely do (a dead branch, an unsafe pattern, copy-paste); it does not run the tests, it imports their coverage report (lcov)
- A quality gate on new code ("clean as you code"): judge each change by what it adds, so the gate is useful from day one instead of failing on old code until someone switches it off
- Configuration as code: the gate lives in the server's database, so a script recreates it; a token is a credential, scoped to one project and kept out of Git

**Done when**
- `docker compose -f compose.sonar.yaml up -d --wait` brings SonarQube up on `127.0.0.1:9010` with container, volume and port names distinct from the backend's (config test, and a real run recorded in the test report).
- `scripts/sonar-setup.sh` run twice creates the project and the gate once, then reports everything already in place (real run).
- `npm run test:coverage && npm run sonar` lands an analysis with the coverage of `src/`, and SonarQube's web API reports the quality gate status and the key metrics (real run, numbers in the test report).
- Generated code and tests are not counted as sources; no password or token is committed (config test).

**Not in this phase:** SonarQube Cloud, pull request decoration or a CI job (no account, no repository secret; the backend made the same call); SonarLint in the editor; fixing the issues the first analysis reports (each real defect becomes a `docs/KNOWN_ISSUES.md` row, hard rule 7).

## E2E additions (`e2e/`)

None. This phase changes no app code; the analysis run is recorded in `docs/test-reports/phase-25.md`.

## Your manual steps (user)

Only when you want to see the dashboard (nothing here is needed to merge):

1. Start it: `docker compose -f compose.sonar.yaml up -d --wait` (first start 1 to 2 minutes, about 2 GB of memory). On a Linux host where Elasticsearch complains about `vm.max_map_count`, run `sudo sysctl -w vm.max_map_count=524288` (Docker Desktop's VM already allows enough).
2. Choose an admin password (SonarQube wants at least 12 characters with upper and lower case, a digit and a symbol) and set it in your shell only: `read -rs SONAR_ADMIN_PASSWORD && export SONAR_ADMIN_PASSWORD`.
3. `bash scripts/sonar-setup.sh`, then copy the `export SONAR_TOKEN=…` line it prints into your shell (shown once; run the script again for a new one).
4. `npm run test:coverage && npm run sonar`, then open **http://localhost:9010/dashboard?id=ecomdemo-web** and sign in as `admin`.
5. Stop it with `docker compose -f compose.sonar.yaml down` (keeps the history; `down -v` wipes it, and step 3 recreates the gate).
