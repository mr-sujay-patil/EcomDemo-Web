# Phase 1: Baseline App

| | |
|---|---|
| **Stage** | Stage 1: Foundation |
| **Technology** | Vite + React + TypeScript (strict) |
| **Branch** | `feature/phase-01-baseline-app` |
| **PR title** | `Phase 01: Baseline App` |
| **Requires** | `phase-00-complete` on `main`; backend running at the pinned tag |
| **Needs from the backend** | product list from `GET /api/products` via the dev proxy |
| **Completion tag** | `phase-01-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** A running app that shows real products from the backend, with nothing else in the way.

**What you'll implement**
- Scaffold with the official Vite React + TypeScript template, **latest stable** Vite, React and TypeScript (verify on npm; no pre-releases). Record versions and why in `docs/decisions.md`.
- `.nvmrc` with the latest Active LTS Node; `engines` in `package.json` to match.
- TypeScript `strict: true`, plus `noUncheckedIndexedAccess` and `noImplicitOverride`; path alias `@/` → `src/`.
- `vite.config.ts`: dev on 5173, preview on 4173, and `/api` proxied to `process.env.API_TARGET ?? 'http://localhost:8080'` for **both** `server` and `preview` (the guide's CORS note; web KI-001).
- Remove the template's demo content. A single page, `src/features/catalog/ProductListPage.tsx`, calls `GET /api/products` with `fetch` and shows each product's name, price (`Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`) and category (`null` → "Other"), with a loading state, an empty state, and an error state showing `ApiError.message` (or the `X-Correlation-Id` for a network or 5xx error). No styling beyond the browser's defaults (Phase 9 brings the design system).
- A hand-written `ProductResponse` type for this one call, marked `// replaced by generated types in Phase 7`.
- npm scripts: `dev`, `build`, `preview`, `typecheck`, and **`verify`** = `typecheck && build`. Later phases add to `verify`, never remove from it.
- README: prerequisites, `nvm use`, `npm ci`, starting the backend from the read-only clone, `npm run dev`.

**Concepts to understand**
- What a bundler and a dev server do (native ES modules and HMR in dev, Rollup bundling and hashing in build)
- Why the proxy avoids CORS entirely
- TypeScript's strict mode
- Components, props and state; why `useEffect` fetching is a stopgap (Phase 8 replaces it)

**Done when**
- `npm ci && npm run verify` passes, and the page lists the seeded products from the running backend, through both `npm run dev` and `npm run preview`.
- With the backend stopped, the page shows the error state, not a blank screen.

**Not in this phase:** tests (Phase 2), E2E (Phase 3), lint (Phase 4), routing (Phase 6), generated API types (Phase 7), styling (Phase 9).

## E2E additions (`e2e/`)

None yet (Playwright arrives in Phase 3). Check by hand: the product list renders; the error state shows with the backend down.

## Your manual steps (user)

Start the backend (from the read-only clone, unless it is already running). Review, merge, and reply `merged, continue`.
