# Phase 15: Semantic Search

| | |
|---|---|
| **Stage** | Stage 3: Shopping |
| **Technology** | Debounced search + URL state |
| **Branch** | `feature/phase-15-search` |
| **PR title** | `Phase 15: Semantic Search` |
| **Requires** | `phase-14-complete` on `main` |
| **Needs from the backend** | search endpoint; `503` when not configured |
| **Completion tag** | `phase-15-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** Find products by what they are for, not only by their words, with a graceful fallback when semantic search is off.

**What you'll implement**
- The header search box: debounced (about 300 ms) as-you-type suggestions (top 5), Enter goes to `/search?q=…`.
- `/search` page: `GET /api/products/search?q=&category=&minPrice=&maxPrice=&limit=20` (limit 1-20; default 5 server-side); `q` up to 200 characters; the query and filters live in the URL. Results are ranked by meaning ("something to type on" finds keyboards); show them in the returned order; similarity is not displayed.
- **503** (semantic search not configured): an `info` `Alert` saying search by description isn't available right now, and a fallback that filters the loaded catalogue by name and description client-side; the page says which it used.
- Cancel stale requests when the query changes (the query's `signal`).
- `docs/modules/search.md`.
- Tests: debounce with fake timers; URL state; stale-response cancellation; 503 fallback.

**Concepts to understand**
- Debouncing versus throttling
- Semantic (vector) search versus keyword search, from the frontend's side
- Cancelling in-flight requests
- URL state for shareable searches

**Done when**
- Against the real backend: a search returns results (or the fallback when the embedding model isn't configured), the URL is shareable, and typing fast sends no request per keystroke.

**Not in this phase:** search analytics.

## E2E additions (`e2e/`)

Search "something to type on" → results or the fallback notice; the URL round-trips; the fallback path with search forced to 503 (route mock).

## Your manual steps (user)

For the full semantic path, start the backend with an embedding model configured (backend Phase 28 settings).
