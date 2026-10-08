# 🖥️ Development Environment

Goal: the machine is never the reason a result is in doubt. The web app is light; the backend it talks to is not (a gateway, seven services and about seventeen containers), so most of this file is about running the two side by side, and about which backend it runs against.

## The pinned backend

| | |
|---|---|
| **Pinned backend** | **commit `82ef5989594c30330850594f388967b8f080ce8a`** on the backend's `main` (backend PR #81, tagged `ki-049-fixed`). The backend publishes no `phase-*` tag after `phase-34-complete`, so the pin is a commit. Previous pins: `f088fd4` (backend PR #75, 2026-10-08), then `phase-34-complete` (backend PR #59, merge `9173309`, 2026-10-06) |
| Why this one | the backend team asked the web to follow `main` after Phase 34: the catalogue is paged (`page`, `size`, `X-Total-Count`, `Link`), catalogue reads and checkout can answer `503` with `Retry-After`, the dead-letter shape changed (`dltTimestamp`), `/actuator` left port 8080, ports bind to 127.0.0.1. Earlier: `phase-34-complete` added product images (web KI-002): `ProductResponse.imageUrl`, a gateway-relative path or `null`, and the anonymous `GET /api/products/{id}/image`. It keeps everything from `phase-33-complete` (RS256 tokens, login throttling `429` + `Retry-After`) and `ki-041-fixed` (CORS preflights) |
| Delta since `phase-33-complete` | `docs/backend/phase-34-delta.md` (earlier: `docs/backend/phase-33-delta.md`) |

Moving the pin is a deliberate commit inside a phase or fix (`chore(backend): pin <tag>`), with `npm run verify`, `npm run api:check` (from Phase 7) and `npm run e2e` rerun, and a `docs/decisions.md` line saying why.

## Folders

Everything lives **inside the WSL2 Linux filesystem**, never under `/mnt/c/...` (slow file watching, CRLF line endings):

    ~/projects/EcomDemo-Web                  # this repository
    ~/projects/ecomdemo-backend-readonly     # read-only clone of the backend, at the pinned tag
    ~/projects/ecomdemo                      # the BACKEND TEAM's working copy: never touched from here

The read-only clone is set up once, in Phase 0:

    git clone https://github.com/mr-sujay-patil/ecomdemo ../ecomdemo-backend-readonly
    git -C ../ecomdemo-backend-readonly checkout 82ef5989594c30330850594f388967b8f080ce8a
    git -C ../ecomdemo-backend-readonly remote set-url --push origin no-push   # a mistaken push fails locally

Reading it is allowed (files, `git log`, `git fetch --tags`, checking out a newer tag when the pin moves). Writing is never allowed: no commits, branches, pushes, PRs, issues or comments on the backend. Never check out a tag in `~/projects/ecomdemo`: that would move the backend team's work.

> ⚠️ **Logs reach Loki only from the compose project `ecomdemo`.** The backend's Alloy config keeps containers whose project label is exactly `ecomdemo`; a clone in `ecomdemo-backend-readonly` has a project of that name, so Loki stays empty (traces are fine). To read logs here, mount a copy of `docker/alloy/config.alloy` with the project name changed through a local override file (outside both repositories); never run this clone as project `ecomdemo` (its volumes are the backend team's). Details: `docs/troubleshooting.md`.

## Running the backend stack next to the backend team's

The backend's compose file gives every container a fixed name (`ecomdemo-<service>`) and publishes the default host ports (8080, 3000, 5432...). Two stacks cannot share them: whoever starts second is blocked, and a web session had been blocking the backend team's own stack. So **start this clone's stack with the wrapper, not with `docker compose up`**:

    bash scripts/backend-stack.sh up        # builds if needed, starts, waits until healthy
    eval "$(bash scripts/backend-stack.sh env)"   # API_TARGET=http://localhost:28080, GATEWAY_CONTAINER=webstack-gateway-service
    bash scripts/backend-stack.sh down      # stops and removes the containers, never the volumes
    bash scripts/backend-stack.sh config    # what would run: each container name and host port

It leaves the clone untouched and starts it with a generated Compose override: containers become `webstack-<service>` and every published host port moves up by 20000 (gateway **28080**, Grafana 23000, Loki 23100, Tempo 23200, Prometheus 39090, the databases 25432 to 25437). The project name stays `ecomdemo-backend-readonly`, so networks and volumes are separate from the backend team's `ecomdemo`. Nothing inside the stack refers to a container name (the services reach each other by service name), so nothing else changes. With the shifted ports the web tools need `API_TARGET` (the dev proxy, the E2E pre-check) and `GATEWAY_CONTAINER` (`npm run e2e:docker`, `npm run perf`, `npm run e2e:service-down` find the gateway by container name): that is what `env` prints. The Windows app on 5435 no longer matters (the customer database is on 25435), so `CUSTOMER_DB_PORT` is not needed.

CI is unaffected: it runs on its own runner with the backend's defaults.

## Running the backend stack

The web's stack and the backend team's no longer collide (the wrapper renames and moves ports, above), but two copies of the **web's** stack still cannot run at once.

1. `docker ps --format '{{.Names}}' | grep -x webstack-gateway-service`: if it is running, **use that stack**. Record which commit it runs in the test report. The backend team's own stack (`ecomdemo-gateway-service`, port 8080) is theirs: never stop or use it from here, unless the owner says so.
2. Otherwise start it from the read-only clone:

       bash scripts/backend-stack.sh up      # about 2 minutes cold; gateway on :28080 (see the section above)

   The clone needs a `.env` with five values (the fifth, `REDIS_PASSWORD`, since backend KI-050 at `82ef598`: compose refuses to start without it and there is no default; generate one with `openssl rand -hex 16`; never commit or print it). The first four, since Phase 33: `JWT_SIGNING_KEY` and `GATEWAY_CLIENT_SECRET`, `APP_CLIENT_SECRET`, `CATALOG_CLIENT_SECRET` (without them anonymous browsing fails with 500). The user creates it once from the backend's `.env.example`, using the one-line generator in that file; it is untracked, never committed, never printed. `JWT_SECRET` is no longer read.
3. Leave the stack as you found it: if you started it, say so in the test report and stop it at the end with `bash scripts/backend-stack.sh down` (never `-v`).

Swagger UI: http://localhost:28080/swagger-ui.html (8080 on the backend team's own stack) (pick a service top-right). The ADMIN account is seeded by a backend migration; its credentials are in the backend README. Use it only in Phase 17's tests, and never write it into this repository: tests read it from `E2E_ADMIN_USERNAME` / `E2E_ADMIN_PASSWORD` in the user's environment.

## Running the web container (from Phase 19)

`compose.yaml` in this repository starts one service, `web` (nginx serving the build, `/api` proxied to `gateway-service:8080`). It never starts, stops or edits a backend service or the backend's compose file: it only joins the network the backend's stack created, as an **external** network.

    docker compose up --build --wait      # http://localhost:8070 (WEB_PORT)
    docker compose down                   # `web` only

- **The network's name** is `<backend compose project>_default`, and the project is the backend folder's name: `ecomdemo_default` for the backend team's checkout, `ecomdemo-backend-readonly_default` for the read-only clone. `compose.yaml` defaults to `ecomdemo_default`; set `BACKEND_NETWORK` for the other (`docker network ls`). `npm run e2e:docker` reads it from the running gateway container.
- **Upstream:** `API_UPSTREAM` (default `http://gateway-service:8080`, the backend compose service name). nginx looks it up when a request arrives, so the container starts and stays healthy even when the gateway is down (`/api` then answers 502).
- **Hardening:** non-root (uid 101), read-only root filesystem, all capabilities dropped, port bound to `127.0.0.1`. The image has no Node.
- **CI** builds the image on every pull request and starts it once; a merge to `main` pushes `ghcr.io/mr-sujay-patil/ecomdemo-web` tagged with the commit SHA and `latest`.

## Running the shop in the backend's kind cluster (from Phase 20)

The cluster is the backend's: kind cluster `ecomdemo` (context `kind-ecomdemo`), namespace `ecomdemo`, Traefik on host port 18080 (from the backend's `scripts/k8s-up.sh`). **It is the backend team's working environment and may run a newer backend than the pin or hold used-up data (web KI-025).** This repository only adds four objects to it (`k8s/`: a Deployment, Service, ConfigMap and Ingress, all named `ecomdemo-web`) and never edits or deletes a backend object.

    bash scripts/k8s-up.sh      # build, `kind load docker-image`, apply, wait; the shop on http://shop.localhost:18080
    npm run e2e:k8s             # up, the whole suite through the Ingress (a pod deleted mid-run), then the disruptive specs
    bash scripts/k8s-down.sh    # deletes exactly the four objects

- `shop.localhost:18080` is the shop; `localhost:18080` stays the backend's own door. Browsers resolve `*.localhost` to 127.0.0.1; Node does not on this machine, so `e2e:k8s` preloads `scripts/localhost-dns.cjs`.
- Both scripts refuse to run unless context `kind-ecomdemo` has the `ecomdemo` namespace (and, for `up`, a `gateway-service`).
- The backend's `scripts/k8s-down.sh` deletes the whole cluster, the shop with it; `k8s-up.sh` here brings it back.

## Measuring performance (from Phase 21)

`npm run perf` builds the production image, starts only `web` beside the running backend stack (the same network detection as `npm run e2e:docker`), runs Lighthouse CI for the shelf and a product page and the signed-in flows for the cart and an order, prints the median tables, keeps `perf-results/`, and takes `web` down. It needs a Chrome: `CHROME_PATH`, otherwise the Chromium Playwright installed (`npx playwright install --with-deps chromium`). It registers three throw-away customers and buys one Desk Mat per run, like the E2E suite. The budgets and the method are in `docs/performance.md`.

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
