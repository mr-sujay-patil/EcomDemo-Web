# EcomDemo Web

The storefront and admin console for the [EcomDemo backend](https://github.com/mr-sujay-patil/ecomdemo), built one technology per phase with TypeScript, React and Vite.

The app talks to the backend only through its gateway (`http://localhost:8080`), against a pinned backend tag. The two repositories share a contract, not code.

**Current status:** Phase 1 (Baseline App): one page lists the products from the running backend; no tests, routing or styling yet.

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

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload on port 5173 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves `dist/` on port 4173, with the same `/api` proxy |
| `npm run typecheck` | `tsc -b`: strict type check of the app and the Vite config |
| `npm test` | Unit and component tests once (Vitest, network faked with MSW; no backend needed) |
| `npm run test:coverage` | The tests with a V8 coverage report; fails below the thresholds in `vite.config.ts` |
| `npm run verify` | Everything a PR must pass: type check, tests, then build |

While writing tests, `npx vitest` re-runs them on every save. How tests are written: [testing guide](docs/process/testing-guide.md).

When you are done with the backend, stop it from the clone with `docker compose --profile tools down` (never `-v`, which deletes its data).

## Where to start

- [Roadmap and progress tracker](docs/ROADMAP.md)
- [Backend integration guide](docs/backend/integration-guide.md): endpoints, rules, errors and screen flows
- [Development environment](docs/process/development-environment.md): the pinned backend tag, the read-only backend clone, ports
- [Execution protocol](docs/process/execution-protocol.md) and [Git workflow](docs/process/git-workflow.md): how every phase is branched, tested, reviewed and merged
