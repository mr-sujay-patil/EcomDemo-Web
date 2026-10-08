# Test Report: Phase 19 (Containerization)

- **Date:** 2026-10-08
- **Branch:** `feature/phase-19-docker`
- **Run by:** Claude Code, on the owner's machine (Windows 11 + WSL2 Ubuntu; Docker Engine 29.8.2, buildx 0.37.2; Playwright's Chromium, headless, in WSL)
- **Node / npm:** v24.21.0 (nvm) / 12.1.0; **no new dependencies**
- **Backend:** pinned `phase-34-complete`. No stack was running, so I started one from the read-only clone with `CUSTOMER_DB_PORT=15435` (a Windows app holds 5435) and stop it at the end without `-v`.
- **Merge verification of Phase 18** (before branching): PR #22 merged as `640d11c` (tag `phase-18-complete` on it); PR #23, the Dependabot bump, merged by the owner as `171a218`. Every branch commit in `main`; `npm ci && npm run verify` exit 0 on `main` (827 tests); `npm run e2e` on `main`: 1004 passed, 1 failed (web KI-020). CI on `main` for `640d11c` green; the run for `171a218` was still going when I branched.
- **Backend sync** (before branching): `origin/main` of the clone is 46 commits past the pin (40 at the last sync). New: **KI-007** pages `GET /api/products` (50 by default, 100 at most, `X-Total-Count`, `Link`). Not adopted, recorded as web **KI-024** for whoever moves the pin: until then the shelf and console would silently show only the first 50 products. Phase 19 needs nothing from the backend. Pin unchanged.

## 1. Full regression

| Command | Result |
|---|---|
| `npm run verify` | exit 0: typecheck, lint (0 warnings), Prettier, `check:tokens`, **827 tests passed** (unchanged: no source file changed), 0 skipped, build ok |

## 2. End-to-end suite

| Run | Result |
|---|---|
| `npm run e2e` (the preview server, as before) | **1004 passed, 1 failed** (1005) |
| **`npm run e2e:docker`** (the whole suite against the container at `http://localhost:8070`) | **985 passed, 1 failed** (986) |

⚠️ **Both failures are web KI-020, unchanged:** `checkout.spec.ts` "a quantity above stock is refused up front" (the Laptop Sleeve's stock is 0 on this stack, so the shelf has no "Add to cart" for it). Not caused by this phase.

Why the container run has a different count: it tests the **shipped** image, which has no `/styleguide` route (the preview build adds it for the suite), so the style guide screen tests are not in that run; it adds the 8 `container.spec.ts` tests. An earlier container run found one real mismatch, `design.spec.ts` "fonts" compared against the literal `http://localhost:4173`; it now compares with the configured origin (same assertion, either origin).

New specs (`e2e/container.spec.ts`, registered only when `E2E_BASE_URL` is set, so no `test.skip`): `/healthz` is 200 `ok`; deep links `/products/1`, `/admin/stock`, `/orders/42` return `index.html`; `index.html` is `no-cache`; every built file named in it is `public, max-age=31536000, immutable`; a missing `/assets/…` is a 404 and not the app; `Server` is `nginx` with no version; the API answers on the same origin with the gateway's `no-store` and the `X-Correlation-Id` I sent coming back; a bad `Authorization` bearer reaches the gateway and gets its 401; a POST with an `Origin` is judged by the gateway (401, not a 403 from the Host/Origin rule, web KI-017).

## 3. Acceptance (Done when)

| Check | Result | How |
|---|---|---|
| The full E2E suite passes against the container with the backend stack up | ⚠️ | 985 of 986; the one failure is web KI-020 (stock data), the same as on the preview server |
| Image under 60 MB | ✅ | **21,748,858 bytes (21.7 MB)** (`docker image inspect`). The full `nginx:alpine` is 93.6 MB, so the slim variant is used (decisions [Phase 19]) |
| Non-root | ✅ | `docker exec ecomdemo-web id`: `uid=101(nginx) gid=101(nginx)`; image `USER nginx` |
| Healthy | ✅ | `HEALTHCHECK` on `/healthz`: `docker inspect` health `healthy`; `docker compose up --wait` returns only when it is |
| Read-only, no capabilities | ✅ | `ReadonlyRootfs=true`, `CapDrop=[ALL]`, port published as `127.0.0.1:8070` |
| No Node in the final image | ✅ | `which node npm` in the image: not found |
| Compose never touches the backend | ✅ | one service, `web`; the backend network is `external`; `docker compose down` removed only `ecomdemo-web` (the backend containers kept running through every run) |
| A merge publishes it to GHCR | ⚠️ | **not provable before the merge.** The `publish` job runs only for a push to `main`, after verify, e2e and image pass. Its steps and pinned actions are in `.github/workflows/ci.yml`; I could not run GitHub Actions here. After the merge: read the run, then `docker pull ghcr.io/mr-sujay-patil/ecomdemo-web:latest` (the package is private until you make it public in GitHub) |
| CI builds the image on PRs | ✅ | the `image` job; its start-and-check step was run locally, command for command, and passed (healthy, `user=nginx`, `/healthz`, a deep link). Running it locally found a real bug (`.Size` is not a container property) that would have failed the CI step; fixed |

Response headers captured from the running container: `/` → `200`, `Cache-Control: no-cache`, `Server: nginx`; a built `.js` → `200`, `Cache-Control: public, max-age=31536000, immutable`, `Content-Encoding: gzip` when asked; `/healthz` → `200`.

## 4. Widths and themes

No screen changed in this phase (no source file under `src/` changed), so there are no new screenshots; the layout matrix and the Phase 18 baselines ran again in both E2E runs and pass.

## 5. Things to know

- ⚠️ **GHCR publish is unproven until the merge** (see above). If it fails, the usual causes are the repository's "Workflow permissions" setting (Settings → Actions → General must allow the workflow `packages: write`) or the package's visibility. I will read the run after the merge and tell you.
- ⚠️ **The container's network name differs between the two backend checkouts**: `ecomdemo_default` (the backend team's) and `ecomdemo-backend-readonly_default` (the clone). `compose.yaml` defaults to the first and `BACKEND_NETWORK` overrides; `npm run e2e:docker` finds it from the running gateway. When no gateway runs, `docker compose up` fails with "network … not found": start the backend first.
- If the gateway is down, the container still starts and is healthy; `/api` answers `502` until the gateway is back (nginx looks the upstream up per request, every 10 s). I saw the 502 with the image run alone, without a backend.
- The `docker compose` here uses `WEB_PORT` (default 8070); the backend owns 8080–8087 and 8090.
- The `ecomdemo_default` network exists on this machine while the backend team's stack is stopped, and the kind cluster `ecomdemo-control-plane` is running. I touched neither.
- **Not done, on purpose:** Kubernetes (Phase 20); a CSP and security headers (Phase 22); an image vulnerability scan in CI (suggested); the style guide is not in the image.
- **Owner placeholders:** unchanged. Nothing written for the shop.

## 6. Clean-up

`npm run e2e:docker` brings `web` down itself; `docker ps` shows no `ecomdemo-web`. The backend stack I started is stopped at the end of this phase without `-v` (see `docs/progress/CURRENT.md`).
