# Recent Phase Summaries (rolling window: last 2 phases)

> Newest first. When a third summary is added, move the oldest to `docs/progress/archive/phase-XX-summary.md`. Maximum ~30 lines per summary: facts only, no narrative.

<!-- TEMPLATE
## Phase XX: <Title> (tag: phase-XX-complete, PR #N)
**What exists now:** <1–3 lines describing the app after this phase>
**Key code:** <features, components, hooks and modules that matter next>
**Config & infrastructure:** <scripts, env vars, ports, proxies, containers, and how to run>
**Tests:** <new unit/component/E2E tests and counts>
**Backend tested against:** <pinned tag>
**Gotchas:** <anything surprising the next phase must know>
**Owner TODOs open:** <TODO(owner) placeholders still waiting for the user>
**Backend asks:** <backend changes reported to the user, with web KI ids>
**Follow-ups (not done, out of scope):** <suggestions deferred to later phases>
-->

## Phase 19: Containerization (tag: phase-19-complete, PR pending)
**What exists now:** The shop ships as one 21.7 MB image: nginx (1.30.5 alpine-slim, official) serving the production build, `/api` proxied to the gateway on the same origin, `/healthz`, SPA fallback, `immutable` hashed assets, `no-cache` index.html, gzip, no server version. Non-root (uid 101), read-only root filesystem, all capabilities dropped, port bound to 127.0.0.1. `compose.yaml` runs only `web` on `${WEB_PORT:-8070}`, joined to the backend's network as an external network. CI builds the image on every PR and publishes it to GHCR on a merge to `main`.
**Key code:** `Dockerfile`, `nginx/default.conf.template`, `compose.yaml`, `.dockerignore`, `scripts/e2e-docker.sh`, `e2e/container.spec.ts`, the `image` and `publish` jobs in `.github/workflows/ci.yml`. Decisions [Phase 19], web KI-024 (backend pagination, for the pin move).
**Config & infrastructure:** `npm run e2e:docker` (builds, starts only `web` on the running gateway's network, runs everything at `E2E_BASE_URL`, `docker compose down` on exit). `BACKEND_NETWORK` is `<backend compose project>_default`: `ecomdemo_default` for the backend team's checkout, `ecomdemo-backend-readonly_default` for the clone. `E2E_BASE_URL` points the suite at any running copy and turns off the preview server and the style guide route (`againstContainer` in `e2e/screens.ts`). New env in `.env.example`: `WEB_PORT`, `BACKEND_NETWORK`, `API_UPSTREAM`.
**Tests:** 827 unit and component (unchanged: no source change); E2E against the container 986 (985 pass, 1 fails on stock data, web KI-020), against the preview 1005 (1004 pass, 1 fails: the same). The two modes differ by design: the container run leaves out the dev-only style guide screens and adds the 8 container specs.
**Backend tested against:** `phase-34-complete`, started with `CUSTOMER_DB_PORT=15435`. Backend `main` is 46 commits past the pin; KI-007 pages `GET /api/products` (web KI-024), not adopted.
**Gotchas:** The image only fills `NGINX_LOCAL_RESOLVERS` when `NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1`. A `tmpfs` over `/var/cache/nginx` and `conf.d` needs `uid=101,gid=101` or nginx cannot write. `docker inspect` of a container has no `.Size` (use `docker image inspect`): found by running the CI step locally. A literal `proxy_pass` host stops nginx at start if it does not resolve: use a variable plus `resolver`. The gateway sends its own `Cache-Control`; do not add one.
**Owner TODOs open:** unchanged from Phase 14; the manual screen-reader pass of Phase 18 is still open.
**Backend asks:** none new. KI-019, KI-020, KI-021, KI-022 still to relay; KI-024 matters at the next pin move.
**Follow-ups (not done, out of scope):** CSP and security headers (Phase 22); pulling the published image in a deployment (Phase 20); a Trivy scan of the image in CI.

## Phase 18: Accessibility (tag: phase-18-complete, PR #22)
**What exists now:** The shop is checked for WCAG 2.2 AA by machine on every screen: axe (no serious or critical violation, both themes), a keyboard sweep (Tab reaches every control, shows focus, nothing covers it, no trap), keyboard-only flows with a pointer guard, 200% and 400% zoom and a 20 px root font, reduced motion, and 32 exact screenshot baselines. `docs/accessibility.md` holds the manual screen-reader checklist (the owner's step, not done yet).
**Key code:** `e2e/a11y.ts` + `a11y.spec.ts`, `keyboard.ts` (`tabTo`, `activate`, `typeInto`, `tabThroughPage`, `watchPointer`) + `keyboard-sweep.spec.ts` + `keyboard-flows.spec.ts`, `layout.ts` (`expectNoOverflow`, shared with `layout.spec.ts` and `zoom.spec.ts`), `motion.spec.ts`, `visual.spec.ts` + `visual.spec.ts-snapshots/`. Fixes: `Layout.tsx` (sign-in link `aria-label`), `Header.css` (text hides only on links with an icon; tool row wraps), `SearchBox.tsx` (an option holds no link), `AccountMenu.tsx` (closes on `focusin` outside), `admin.css` (file input), `styleguide.css`. Decisions [Phase 18], web KI-023 (fixed).
**Config & infrastructure:** new dev dependency `@axe-core/playwright` 4.13.0 (exact). `playwright.config.ts` compares screenshots exactly (`maxDiffPixels: 0`, animations off). `npm run e2e:baselines` updates the baselines (reason in the PR). `stubConsole` is exported from `e2e/screens.ts` (the shelf and product pictures use it).
**Tests:** 827 unit and component (was 824); E2E 1005, 1004 pass and 1 fails on stock data (web KI-020) (was 420): axe 136, sweep 68, keyboard flows 5, zoom 272, motion 72, visual 32.
**Backend tested against:** `phase-34-complete`, started with `CUSTOMER_DB_PORT=15435`.
**Gotchas:** `addStyleTag` rejects empty CSS. After a blur Chromium keeps the Tab starting point: focus `<body>` (with a temporary `tabindex`) to start a lap at the top. A field's ring is on its wrapper and a card link's on `::after`, so "focus visible" compares the element, three ancestors and their pseudo-elements. A file input needs `width: 100%; min-width: 0` or it widens a 320 px page. `page.goto` loses in-page flags: the pointer guard reports through `exposeFunction`.
**Owner TODOs open:** unchanged from Phase 14; plus the manual screen-reader pass in `docs/accessibility.md`.
**Backend asks:** none new. KI-019, KI-020, KI-021, KI-022 still to relay.
**Follow-ups (not done, out of scope):** Firefox and WebKit projects (axe and keyboard are Chromium only); text-spacing (1.4.12) and forced-colors checks; measuring the focus ring's contrast per surface.
