# Test Report: Phase 25 (Code Quality Dashboard, SonarQube)

- **Date:** 2026-10-11
- **Branch:** `feature/phase-25-sonarqube`
- **Run by:** Claude Code in a cloud container (Linux 6.18, 4 CPUs, 15 GB), Node v24.21.0, npm 11.19.0, Docker 29.8.2, Compose 5.6.0
- **New dependencies:** none (npm). New images, pinned: `sonarqube:26.9.0.129388-community`, `postgres:18.6-alpine3.24`, `sonarsource/sonar-scanner-cli:12.2.0.4256_8.1.0`.
- **Backend:** not needed and not started: the phase changes no app code and calls no API. The pin is unchanged (commit `669a9ed`). The backend team's SonarQube was not running here and was never touched.
- **Pre-flight:** Phase 24 merged (PR #44, merge `70d64f6`), CI on `main` green; the branch was cut from it.

## 1. Unit tests

`npm ci && npm run verify`: see section 4. New file `scripts/sonar.test.ts` (**15 tests**, no server, reads the files as CI sees them):

| Group | What it proves |
|---|---|
| The stack (`compose.sonar.yaml`) | every image exact (SonarQube the backend's build, no `latest`/`lts`/`community` tag; the scanner too); only SonarQube published, on `127.0.0.1:${SONAR_PORT:-9010}`; project `ecomdemo-web-sonar`, containers `ecomdemo-web-sonarqube` and `ecomdemo-web-sonar-db` (never the backend's `ecomdemo-sonarqube` / `ecomdemo-sonar-db`); the healthcheck waits for `"status":"UP"` |
| The analysis (`sonar-project.properties`) | project key matches the setup script; sources `src`; tests in `sonar.test.inclusions` and excluded from sources; `src/api/generated/**` excluded; lcov path and the `lcov` reporter in `vite.config.ts`; `src/main.tsx` out of coverage in both; the app's tsconfig; `qualitygate.wait`; `npm run sonar` runs the script with a read-only mount |
| The gate (`scripts/sonar-setup.sh`) | exactly the backend's six conditions, each on a `new_*` metric, coverage 80; the token is a project analysis token |
| No secrets | password and token only from the environment, the scripts refuse to run without them, `-e SONAR_TOKEN` passed by name; no token-shaped string, no `sonar.token=`/`login`/`password` property, no assigned password except SonarQube's public factory `admin` (which the script replaces); curl gets credentials on stdin (`--config -`), never `-u` |

## 2. The real run (SonarQube in Docker)

All commands from the repository root, output trimmed. The admin password was generated at run time into a mode-600 file in the session's scratch directory, outside the repository, and deleted at the end; the token was read from the script's output into the environment, never displayed (the output below is redacted).

**Environment note (this machine only, not committed).** The first `docker compose -f compose.sonar.yaml up -d --wait` brought PostgreSQL up healthy, but SonarQube stopped after 2 minutes: `ERROR web[][o.s.s.p.Platform] Background initialization failed … IndexCreator: Fail to execute es request`, after `high disk watermark [90%] exceeded on … free: 20.3gb[8%]`. This container's disk is a 252 GB volume with 20 GB free, so Elasticsearch sees 8 % free and will not allocate its index. `vm.max_map_count` was raised to 524288 on this host (`sysctl -w` was allowed) and was not the problem. The run continued with an **uncommitted** override that puts only the search index (`/opt/sonarqube/data/es9`, rebuilt by SonarQube from PostgreSQL) on a 2 GB tmpfs; every other setting is the committed file's. A user's machine with 10 to 15 % of its disk free needs no override; the README names the symptom.

```text
$ docker compose -f compose.sonar.yaml -f <scratch>/sonar-es-tmpfs.override.yaml up -d --wait --wait-timeout 600
 Container ecomdemo-web-sonar-db Healthy
 Container ecomdemo-web-sonarqube Healthy                       (exit 0)
$ curl -s http://127.0.0.1:9010/api/system/status
{"id":"…","version":"26.9.0.129388","status":"UP"}
$ docker ps --format '{{.Names}} {{.Ports}}'
ecomdemo-web-sonarqube 127.0.0.1:9010->9000/tcp
ecomdemo-web-sonar-db 5432/tcp                                  (database not published)
```

**Setup, first run** (fresh server):

```text
$ SONAR_ADMIN_PASSWORD=… bash scripts/sonar-setup.sh
  OK    server is UP
  OK    changed the factory admin password to SONAR_ADMIN_PASSWORD
  OK    created project 'ecomdemo-web'
  OK    created quality gate 'EcomDemo Web way'
  Conditions (all on new code):
  --    new_coverage LT 80 …                       (a new gate already carries Sonar's four defaults,
  --    new_violations GT 0 …                       with the same thresholds as ours)
  --    new_duplicated_lines_density GT 3 …
  --    new_security_hotspots_reviewed LT 100 …
  OK    new_reliability_rating GT 1: no new bug (rating A)
  OK    new_security_rating GT 1: no new vulnerability (rating A)
  OK    'EcomDemo Web way' is the quality gate of 'ecomdemo-web'
  OK    generated the analysis token 'ecomdemo-web-analysis' (any older one with that name is revoked)
  export SONAR_TOKEN='<redacted>'
```

**Idempotent:** a second and a third run (`--no-token`) printed `--` (already in place) for every step: password, project, gate, six conditions, attachment; the only `OK` line was "server is UP". **Drift:** after `new_coverage` was set to 70 through the API (as a UI edit would), the next run printed `OK new_coverage LT 80 (was LT 70)`, and the run after it changed nothing. **Failures:** a wrong `SONAR_ADMIN_PASSWORD` stops with "neither SONAR_ADMIN_PASSWORD nor the factory password signs in as 'admin'"; no password at all stops with the instructions to set one.

**Coverage, then the analysis** (twice; the second with the final `scripts/sonar-scan.sh`):

```text
$ npx vitest run --coverage            Test Files 79 passed (79), Tests 981 passed (981); coverage/lcov.info written
                                       (SF: paths relative to the repository, e.g. SF:src/api/access.ts)
$ npm run sonar
INFO  265 files indexed
INFO  Sensor JavaScript/TypeScript Coverage [javascript]  Analysing [/usr/src/coverage/lcov.info]
WARN  Could not resolve 5 file paths in [/usr/src/coverage/lcov.info]   First unresolved path: src/api/generated/app.ts
INFO  SCM Publisher 256/256 source files have been analyzed
INFO  QUALITY GATE STATUS: PASSED - View details on http://sonarqube:9000/dashboard?id=ecomdemo-web
INFO  EXECUTION SUCCESS                                                 (exit 0)
$ git status --short                   (only this phase's own edits: the read-only mount left no scanner files)
```

The 5 unresolved paths are the generated API files: Vitest's coverage lists them, the analysis leaves them out, so the warning is expected. The scanner's "make sure to run the analysis inside a git repository" warning comes from its Git CLI refusing a checkout owned by another uid (root here, uid 1000 in the image); blame still worked through JGit (256/256). On a WSL checkout owned by uid 1000 it does not appear.

**What SonarQube's web API reports** (`/api/qualitygates/project_status`, `/api/measures/component`, `/api/issues/search`, after the second analysis):

| Measure | Value |
|---|---|
| Quality gate | **OK** (Passed). First analysis: `conditions: []`, nothing is new code yet; second: `new_violations` 0, `new_reliability_rating` A, `new_security_rating` A, all OK (coverage and duplication are not evaluated with 0 new lines) |
| Coverage | **99.2 %** overall (line 100.0 %, branch 98.2 %; 1,945 lines to cover, 0 uncovered) |
| Size | 8,483 lines of code in 176 source files; 80 test files analysed as tests; 0 generated files in the analysis |
| Bugs / vulnerabilities / security hotspots | 0 / 0 / 0 (reliability A, security A in the legacy ratings) |
| Issues | **144**, all maintainability (code smells): 5 HIGH, 64 MEDIUM, 75 LOW (+1 INFO); 137 in sources, 7 in tests. Debt 793 min, maintainability A. In the server's MQR mode one of them (`S7773`, prefer `Number.NaN`) also counts as Reliability, so the dashboard's Reliability letter is C |
| Duplication | 0.5 % |

The 144 findings by rule are web **KI-038** (to triage; not fixed in this phase, hard rule 7).

**The gate fails on bad new code** (a throwaway copy of the repository in the scratch directory, its own `git init`, a throwaway project `ecomdemo-web-gate-demo` on the same gate and a temporary global analysis token, all deleted and revoked afterwards): the baseline analysis passed; then `src/lib/gateDemo.ts` (an untested function with a nested ternary) was committed and analysed again:

```text
ERROR QUALITY GATE STATUS: FAILED - View details on http://sonarqube:9000/dashboard?id=ecomdemo-web-gate-demo
INFO  EXECUTION FAILURE                                                 (exit 3, so `npm run sonar` fails)
project_status: ERROR
  ERROR new_violations GT 0                  actual 2     (typescript:S3358 twice, gateDemo.ts line 3)
  OK    new_coverage LT 80                   actual 0.0   (not enforced: fewer than 20 new lines)
  OK    new_duplicated_lines_density GT 3    actual 0.0
  OK    new_reliability_rating, new_security_rating       actual A
```

SonarQube skips coverage and duplication conditions for a change of fewer than 20 new lines (its "small changes" default), so the 0 % coverage was reported but not what failed the gate; the new issues were.

**Cleanup:** `docker compose -f compose.sonar.yaml -f <override> down` (containers and network removed; volumes kept, they are this repository's own). Nothing of the backend's was started, stopped or read from a running service.

## 3. Screens

Not an app screen: two views of the dashboard after the real run, 1280 px, light (SonarQube's own UI).

| View | File |
|---|---|
| Overview, overall code: gate Passed, 0 security issues, 1 reliability, 144 maintainability, coverage 99.2 %, duplication 0.5 % | `phase-25/dashboard-overall-1280.png` |
| The gate `EcomDemo Web way`: conditions on new code (and the MQR-mode note on the two rating conditions, decision [Phase 25]) | `phase-25/quality-gate-conditions-1280.png` |

## 4. Full regression

`npm ci && npm run verify` (typecheck, lint, format check, token check, unit tests with coverage, build, budgets, dist check): **exit 0**, on the branch with all of this phase's code (commit `632d2f9`; only Markdown changed after it). **996 tests in 80 files** passed (was 981 in 79; +15 in `scripts/sonar.test.ts`), none skipped; coverage unchanged (statements 99.94 %, branches 98.21 %, functions 100 %, lines 100 %; the thresholds are untouched); budgets: the shelf 8 files, 134.8 KB gzipped (limit 170), biggest chunk 96.4 KB (limit 100); `check:dist` clean.

## 5. Not run, and why

- **`npm run e2e`:** not run. This phase changes no app code (`src/` is untouched; `vite.config.ts` only gains a coverage reporter), and there is no backend stack here. CI's `e2e` job runs it on the PR.
- **`npm run perf`:** skipped: nothing under `src/`, the bundle, nginx or the cart and order flows changed. CI runs it on the PR.
- **Manual for the owner:** run section 2 on your machine (README, "Code quality dashboard"); the only expected difference is that no tmpfs override is needed.
