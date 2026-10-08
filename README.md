# EcomDemo Web

The storefront and admin console for the [EcomDemo backend](https://github.com/mr-sujay-patil/ecomdemo), built one technology per phase with TypeScript, React and Vite.

The app talks to the backend only through its gateway (`http://localhost:8080`), against a pinned backend tag. The two repositories share a contract, not code.

**Current status:** Phase 3 (End-to-End Smoke Tests): one page lists the products from the running backend. Component tests (Vitest) and an end-to-end smoke suite (Playwright, against the real backend) guard it; no routing or styling yet.

## Prerequisites

Everything runs inside WSL2 (Ubuntu), in the Linux filesystem, never under `/mnt/c`:

- **Node.js 24** (the version in `.nvmrc`) through [nvm](https://github.com/nvm-sh/nvm). npm comes with it.
- **Git** and the **GitHub CLI** (`gh`), signed in.
- **Docker Desktop** with WSL2 integration, for the backend stack.
- The read-only backend clone at `../ecomdemo-backend-readonly`, at the pinned tag, with its own `.env` (see [Development environment](docs/process/development-environment.md)).

## Run it

```bash
nvm use                 # switch to the Node version in .nvmrc
npm ci                  # install exactly what package-lock.json lists
```

Start the backend, unless `docker ps` already shows `ecomdemo-gateway-service` (only one stack can run at a time):

```bash
cd ../ecomdemo-backend-readonly
docker compose up --build --wait     # about 2 minutes cold; gateway on :8080
cd -
```

Then start the app:

```bash
npm run dev             # http://localhost:5173
```

`/api` requests go to the gateway through Vite's proxy, so the browser only ever talks to its own origin. Set `API_TARGET` (in the shell or a `.env` file, see `.env.example`) to point it somewhere else.

### As a container

The shop also ships as one small image: nginx serving the build, with `/api` forwarded to the gateway on the same origin. With the backend stack up:

```bash
docker compose up --build --wait     # the shop on http://localhost:8070 (WEB_PORT changes the port)
docker compose down                  # stops only the shop; the backend is never touched
```

The container joins the backend's Docker network. Its name is `<backend compose project>_default`: `ecomdemo_default` for the backend team's checkout, `ecomdemo-backend-readonly_default` for the read-only clone. Set `BACKEND_NETWORK` to the one that is running (`docker network ls`). `npm run e2e:docker` finds it by itself, runs the whole suite against the container and takes `web` down again. Details: `docs/process/development-environment.md`.

### In the backend's kind cluster

With the backend's kind cluster up, `bash scripts/k8s-up.sh` adds the shop to it (two replicas behind the cluster's Traefik): **http://shop.localhost:18080**, while `localhost:18080` stays the backend's own. `bash scripts/k8s-down.sh` removes only what it added.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload on port 5173 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves `dist/` on port 4173, with the same `/api` proxy |
| `npm run typecheck` | `tsc -b`: strict type check of the app, the Vite and Playwright configs, and `e2e/` |
| `npm test` | Unit and component tests once (Vitest, network faked with MSW; no backend needed) |
| `npm run test:coverage` | The tests with a V8 coverage report; fails below the thresholds in `vite.config.ts` |
| `npm run lint` | ESLint over the app, tests, `e2e/` and configs (type-aware rules, React Hooks, accessibility, Playwright); any warning fails it |
| `npm run format` | Prettier rewrites every code and config file in place (Markdown and `design-system/` are left as written) |
| `npm run format:check` | Prettier lists the files it would change, and fails if there are any |
| `npm run verify` | Everything a PR must pass: type check, lint, format check, tests, then build |
| `npm run e2e` | End-to-end smoke tests: builds and previews the app on 4173, then drives it in Chromium against the real backend (it must be running). Every screen is also checked at 360–1280 px in light and dark |
| `npm run e2e:ui` | The same tests in Playwright's UI mode, to watch and debug them step by step |
| `npm run e2e:docker` | Builds the image, starts only the `web` container beside the running backend stack, runs the whole E2E suite against `http://localhost:8070`, then stops `web` |
| `npm run e2e:k8s` | Puts the image in the backend's kind cluster (`scripts/k8s-up.sh`), runs the whole suite through `http://shop.localhost:18080` with one pod deleted mid-run, then a pod deletion and a rolling update under traffic with zero failed requests |
| `npm run e2e:report` | Saves screenshots at 360 and 1280 px into `docs/test-reports/phase-XX/` (the phase comes from the branch, or `REPORT_PHASE=phase-XX`) |

If `format:check` fails, run `npm run format` and commit the result. Editors pick up `.editorconfig`; with the ESLint and Prettier extensions installed they show lint errors as you type and can format on save. There is no pre-commit hook: CI enforces both from Phase 5.

While writing tests, `npx vitest` re-runs them on every save. How tests are written: [testing guide](docs/process/testing-guide.md).

The first `npm run e2e` on a machine needs Playwright's Chromium: `npx playwright install --with-deps chromium` (asks for `sudo` for the system libraries). If the backend is down, the run stops at once with one message saying so. When a test fails, `npx playwright show-report` opens the HTML report; `npx playwright test --trace on` records a trace of every test to step through.

When you are done with the backend, stop it from the clone with `docker compose --profile tools down` (never `-v`, which deletes its data).

## Routes

Routing is React Router's data router: the table is in `src/app/router.tsx` and explained in [`docs/architecture/routing.md`](docs/architecture/routing.md). Every screen has a URL (`/`, `/cart`, `/about`, ...); pages a later phase builds show a placeholder naming that phase. The store's operator, contact email and ship-from city are `TODO(owner)` values in `src/content/site.ts`, shown in the footer until you fill them in, and the words on `/about`, `/returns`, `/shipping`, `/privacy` and `/terms` are `TODO(owner)` paragraphs in `src/features/content/`.

## Catalogue and server state

The shelf (`/`) loads the product list once and filters, sorts and pages it in the browser; category, sort and page are in the URL (`/?category=AUDIO&sort=price&page=2`), so a reload or a shared link keeps them. A product opens at `/products/:id`. Server data is cached by TanStack Query: how, and why the defaults are what they are, is in [`docs/architecture/state.md`](docs/architecture/state.md), and the feature is described in [`docs/modules/catalog.md`](docs/modules/catalog.md).

## Design system

The look comes from the approved design in [`design-system/`](design-system/), ported in Phase 9: tokens and self-hosted fonts in `src/styles/`, seventeen components in `src/components/<Name>/`, plain CSS on tokens only (no Tailwind, no component library, no icon library, no gradients, no emoji). Light and dark follow the system until you press the **Theme** button in the header (Auto, Light, Dark); the choice is kept in this browser. `npm run check:tokens` (part of `npm run verify`) fails on a hex colour, a px font size or a banned import in `src/`. To see every component in its states run `npm run dev` and open `/styleguide`. How it fits together: [`docs/architecture/design-system.md`](docs/architecture/design-system.md).

## Accounts and sign-in

`/register` creates a customer account (`POST /api/customers/register`) and takes you to `/sign-in`. Signing in keeps a session **in memory only** (never `localStorage`, a cookie or the URL): you stay signed in while you shop, until the session ends (about 15 minutes, no refresh) or you reload the page. A quiet notice appears a minute before the end; when it ends, or the server refuses the token, you are sent to `/sign-in?next=…` and come back to the page you were on, with what you had typed (never a password). `/cart`, `/checkout`, `/orders` and `/account` need a signed-in customer, `/admin` an admin; the wrong role sees "Not permitted". Forms use React Hook Form with Zod schemas that mirror the backend's rules; the backend's answer is shown on the field it names. The backend throttles failed logins per client address (the form shows a countdown), so avoid repeated wrong-password tests. See [`docs/architecture/auth-flow.md`](docs/architecture/auth-flow.md), [`docs/architecture/forms.md`](docs/architecture/forms.md), [`docs/modules/auth.md`](docs/modules/auth.md) and [`docs/modules/accounts.md`](docs/modules/accounts.md).

## Search

The header search box suggests the top five products as you type (after a 300 ms pause) and Enter opens `/search?q=…`, whose query and filters (`category`, `minPrice`, `maxPrice`) live in the URL, so a search can be shared. Results are ranked by meaning by the backend (`GET /api/products/search`) and shown in its order. When the backend has no embedding model configured it answers 503; the page then says search by description is not available and matches the words against product names and descriptions instead. See [`docs/modules/search.md`](docs/modules/search.md).

## Ask the shop

A secondary button in the header opens the assistant: a sheet (a native `<dialog>`, 400 px wide, the whole screen under 480 px) where a signed-in customer asks in plain words and gets an answer with what it checked. When the assistant proposes a product, nothing changes in the cart until the customer presses **Add it**; **Not now** leaves it. If the backend has no model, the sheet says the assistant isn't available and offers a search instead. See [`docs/modules/assistant.md`](docs/modules/assistant.md).

## API contract

The backend's OpenAPI documents are the contract. Three commands keep the types honest (details: [`docs/architecture/api-layer.md`](docs/architecture/api-layer.md)); they need the backend running at the pinned tag:

| Command | What it does |
|---|---|
| `npm run api:snapshot` | downloads the five documents into `api/openapi/` (commit alone: `chore(api): regenerate from backend <tag>`) |
| `npm run api:generate` | generates `src/api/generated/*.ts` from the snapshots (never hand-edited) |
| `npm run api:check` | fails if the live backend differs from the snapshots; runs first in `npm run e2e` |

## Continuous integration

Every pull request, and every push to `main`, runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml) on GitHub Actions. **A PR is merged only when both checks are green.**

| Job | What it does |
|---|---|
| `verify` | `npm ci`, `npm run verify` and `npm run test:coverage` on the Node version in `.nvmrc`; the coverage report is saved as the run's `coverage` artifact |
| `e2e` | Checks out the backend at `BACKEND_TAG` (default `phase-34-complete`), builds and starts its compose stack with a generated, masked signing key and client secrets, then runs `npm run e2e`. On failure it saves the Playwright report and traces (`playwright-report`) and the backend's logs (`backend-logs`) |

The job builds the backend from source because its per-service images are not published yet ([web KI-015](docs/KNOWN_ISSUES.md)), so it takes a while. The runner's memory and each container's use are printed on the run's summary page. To test against a newer backend, set the repository variable `BACKEND_TAG` (Settings → Secrets and variables → Actions → Variables). Nothing secret is stored in this repository.

A failed check links to its log from the PR. To open a failed E2E run's trace, download the `playwright-report` artifact, unzip it, and run `npx playwright show-report <folder>/playwright-report` (or `npx playwright show-trace` on a `trace.zip` under `test-results/`).

Dependabot ([`.github/dependabot.yml`](.github/dependabot.yml)) opens weekly PRs: one for all npm minor and patch updates, one per major version, and one for the actions. It skips the TypeScript and ESLint upgrades held back on purpose (see `docs/decisions.md`, Phase 4).

## Where to start

- [Roadmap and progress tracker](docs/ROADMAP.md)
- [Backend integration guide](docs/backend/integration-guide.md): endpoints, rules, errors and screen flows
- [Development environment](docs/process/development-environment.md): the pinned backend tag, the read-only backend clone, ports
- [Execution protocol](docs/process/execution-protocol.md) and [Git workflow](docs/process/git-workflow.md): how every phase is branched, tested, reviewed and merged
