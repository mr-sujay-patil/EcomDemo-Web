# Phase 6: Routing

| | |
|---|---|
| **Stage** | Stage 2: Application Shell |
| **Technology** | React Router |
| **Branch** | `feature/phase-06-routing` |
| **PR title** | `Phase 06: Routing` |
| **Requires** | `phase-05-complete` on `main` |
| **Needs from the backend** | none |
| **Completion tag** | `phase-06-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** The app's skeleton: every screen from the guide's section 5 has a route, a title and a place in the layout, and the human surfaces exist from day one.

**What you'll implement**
- `src/app/router.tsx` with React Router's data router. Routes: `/` (catalogue), `/products/:id`, `/search`, `/cart`, `/checkout`, `/orders`, `/orders/:id`, `/account`, `/sign-in`, `/register`, `/admin/*`, `/about`, `/returns`, `/shipping`, `/privacy`, `/terms`, and a 404. Pages later phases build are placeholders with their final `h1` and one line naming the phase that builds them. The Phase 1 product list moves to `/`.
- Layout: a header (store name linking home, placeholders for search and cart), a main region with a "Skip to content" link, and a footer: who runs the store, a contact email, the city orders ship from, links to Returns, Shipping, Privacy and Terms, all `TODO(owner)` values in one `src/content/site.ts` so the user fills them in one place.
- `/about`, `/returns`, `/shipping`: final headings and structure, every paragraph a `TODO(owner)` placeholder. The report may point the user at the backend's assistant policy documents (in the read-only clone, `assistant-service/src/main/resources/policies/`) as a starting point to adapt, but they are not copied in as the store's words.
- Document titles per route (`EcomDemo · Your cart`), focus moved to the page `h1` on navigation, scroll restored.
- Route-level code splitting with `lazy` for `/admin/*`, `/checkout` and the assistant.
- Tests: every route renders its `h1`; unknown paths render the 404; the skip link moves focus; footer links resolve.
- `docs/architecture/routing.md`: the route table and why each route exists.

**Concepts to understand**
- Client-side routing and the History API; why the server needs an SPA fallback (Phase 19)
- Nested routes, layouts and `<Outlet>`
- Focus management on route change
- Code splitting by route

**Done when**
- Every route loads by direct URL (through `npm run preview`) and by navigation; every placeholder is listed in the report.

**Not in this phase:** data on any new page, styling (Phase 9).

## E2E additions (`e2e/`)

Every route by deep link and by navigation; the 404; the keyboard skip link. The layout matrix now covers every route.

## Your manual steps (user)

Fill in `src/content/site.ts` and the About, Returns and Shipping text when you are ready (the placeholders stay visible until you do).
