# Phase 19: Containerization

| | |
|---|---|
| **Stage** | Stage 6: Delivery |
| **Technology** | Docker + nginx (same-origin proxy to the gateway) |
| **Branch** | `feature/phase-19-docker` |
| **PR title** | `Phase 19: Containerization` |
| **Requires** | `phase-18-complete` on `main` |
| **Needs from the backend** | same-origin serving (CORS fix not required) |
| **Completion tag** | `phase-19-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** Ship the app as one small container that serves the build and forwards `/api` to the gateway, the same origin in every environment.

**What you'll implement**
- `Dockerfile`: stage 1 on the pinned Node LTS image runs `npm ci && npm run build`; stage 2 on the official `nginx` stable alpine image (pinned). Non-root; `HEALTHCHECK` on `/healthz`.
- `nginx/default.conf.template`: SPA fallback (`try_files $uri /index.html`); `/api/` proxied to `${API_UPSTREAM}` passing `Authorization` and `X-Correlation-Id`, with sensible timeouts (the admin CSV import runs long); `/healthz` 200; `immutable` year-long caching for hashed assets and `no-cache` for `index.html`; gzip; `server_tokens off`.
- `.dockerignore`.
- `compose.yaml` in **this** repository: one service, `web`, on `${WEB_PORT:-8070}`, joining the backend's compose network as an **external** network (its name read from the backend's compose project and recorded in `decisions.md`), `API_UPSTREAM=http://gateway-service:8080` (the real service name from the backend's compose file). It never starts, stops or changes backend services, and never edits the backend's `compose.yaml`.
- `npm run e2e:docker`: builds the image, `docker compose up --wait`, runs the suite against `http://localhost:8070`, brings only `web` down.
- CI: build the image on PRs; on merge to `main`, push it to GHCR tagged with the commit SHA and `latest`.

**Concepts to understand**
- Multi-stage builds; why the final image has no Node
- Serving an SPA: fallback routing and cache headers
- Reverse proxying and same-origin
- External compose networks shared between two projects

**Done when**
- The full E2E suite passes against the container with the backend stack up; the image is under 60 MB, non-root, healthy (numbers in the report); a merge publishes it to GHCR.

**Not in this phase:** Kubernetes (Phase 20), CSP (Phase 22).

## E2E additions (`e2e/`)

`npm run e2e:docker` runs the whole suite against the container; plus: a deep link returns `index.html`, a hashed asset is `immutable`, `index.html` is `no-cache`, `/healthz` is 200.

## Your manual steps (user)

Keep Docker Desktop running with the backend stack up.
