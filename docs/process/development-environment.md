# 🖥️ Development Environment

Goal: the machine is never the reason a result is in doubt. The web app is light; the backend it talks to is not (a gateway, seven services and about seventeen containers), so most of this file is about running the two side by side, and about which backend it runs against.

## The pinned backend

| | |
|---|---|
| **Pinned backend tag** | **`phase-34-complete`** (backend PR #59, merge commit `9173309`, 2026-10-06) |
| Why this one | it adds product images (web KI-002): `ProductResponse.imageUrl`, a gateway-relative path or `null`, and the anonymous `GET /api/products/{id}/image`. It keeps everything from `phase-33-complete` (RS256 tokens, login throttling `429` + `Retry-After`) and `ki-041-fixed` (CORS preflights) |
| Delta since `phase-33-complete` | `docs/backend/phase-34-delta.md` (earlier: `docs/backend/phase-33-delta.md`) |

Moving the pin is a deliberate commit inside a phase or fix (`chore(backend): pin <tag>`), with `npm run verify`, `npm run api:check` (from Phase 7) and `npm run e2e` rerun, and a `docs/decisions.md` line saying why.

## Folders

Everything lives **inside the WSL2 Linux filesystem**, never under `/mnt/c/...` (slow file watching, CRLF line endings):

    ~/projects/EcomDemo-Web                  # this repository
    ~/projects/ecomdemo-backend-readonly     # read-only clone of the backend, at the pinned tag
    ~/projects/ecomdemo                      # the BACKEND TEAM's working copy: never touched from here

The read-only clone is set up once, in Phase 0:

    git clone https://github.com/mr-sujay-patil/ecomdemo ../ecomdemo-backend-readonly
    git -C ../ecomdemo-backend-readonly checkout phase-34-complete
    git -C ../ecomdemo-backend-readonly remote set-url --push origin no-push   # a mistaken push fails locally

Reading it is allowed (files, `git log`, `git fetch --tags`, checking out a newer tag when the pin moves). Writing is never allowed: no commits, branches, pushes, PRs, issues or comments on the backend. Never check out a tag in `~/projects/ecomdemo`: that would move the backend team's work.

## Running the backend stack

Only one backend stack can run at a time: both copies use the same container names and ports.

1. `docker ps --format '{{.Names}}' | grep -x ecomdemo-gateway-service`: if it is running, **use that stack** and do not start a second one. Record which tag it runs in the test report (ask the user if unsure).
2. Otherwise start it from the read-only clone:

       cd ../ecomdemo-backend-readonly
       docker compose up --build --wait      # about 2 minutes cold; gateway on :8080

   The clone needs a `.env` with four values since Phase 33: `JWT_SIGNING_KEY` and `GATEWAY_CLIENT_SECRET`, `APP_CLIENT_SECRET`, `CATALOG_CLIENT_SECRET` (without them anonymous browsing fails with 500). The user creates it once from the backend's `.env.example`, using the one-line generator in that file; it is untracked, never committed, never printed. `JWT_SECRET` is no longer read.
3. Leave the stack as you found it: if you started it, say so in the test report and stop it at the end with `docker compose --profile tools down` (never `-v`).

Swagger UI: http://localhost:8080/swagger-ui.html (pick a service top-right). The ADMIN account is seeded by a backend migration; its credentials are in the backend README. Use it only in Phase 17's tests, and never write it into this repository: tests read it from `E2E_ADMIN_USERNAME` / `E2E_ADMIN_PASSWORD` in the user's environment.

## What must be installed inside WSL2

- **Node.js, latest Active LTS**, through `nvm` (pinned in `.nvmrc` from Phase 1). npm comes with it. No yarn, no pnpm.
- **Git** and the **`gh` CLI**, authenticated (`gh auth login`).
- **Docker Desktop** with WSL2 integration, for the backend stack and, from Phase 19, this app's image.
- From Phase 3: Playwright's Chromium and its system libraries (`npx playwright install --with-deps chromium`; the first run needs `sudo`, a manual step for the user).
- From Phase 20: kind and kubectl (already installed for the backend's Phase 25).

## Ports

| Port | What | Note |
|---|---|---|
| 8080 | backend gateway | the only backend port this app uses |
| 5173 | `npm run dev` | Vite default |
| 4173 | `npm run preview` (production build) | Vite default; Playwright runs against it |
| 8070 | this app's nginx container (`WEB_PORT`, Phase 19) | 8080–8087 and 8090 belong to the backend |
| 18080 | the kind Ingress (backend) | this app gets its own host rule, `shop.localhost`, in Phase 20 |

Never use 3000: it is the backend's Grafana.

## Secrets

This repo needs almost none. `.env` is gitignored from Phase 0; `.env.example` lists every variable with a safe default. E2E customers are **registered by the tests themselves** (generated usernames and passwords). The admin credentials (Phase 17) and any CI secrets are set by the user as environment variables or GitHub secrets. Never paste a secret into a commit, a PR or the conversation.

## Git identity

Use the identity the backend history uses, repo-local, set in Phase 0:

    git config user.name  "sujaysp"
    git config user.email "47919226+sujaysp@users.noreply.github.com"

## Reporting results

Rule 8 of `CLAUDE.md` applies per machine. When a check runs somewhere Claude Code cannot see, the report says whose run it was and shows the output.
