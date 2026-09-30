# Phase 7: Typed API Client

| | |
|---|---|
| **Stage** | Stage 2: Application Shell |
| **Technology** | openapi-typescript + openapi-fetch |
| **Branch** | `feature/phase-07-api-client` |
| **PR title** | `Phase 07: Typed API Client` |
| **Requires** | `phase-06-complete` on `main`; backend at the pinned tag serving `/v3/api-docs/<service>` through the gateway |
| **Needs from the backend** | the five `/v3/api-docs/<service>` documents |
| **Completion tag** | `phase-07-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** Every call is typed from the backend's own contract, so a backend change breaks the build, not the page.

**What you'll implement**
- `npm run api:snapshot`: downloads the five documents from the gateway, `http://localhost:8080/v3/api-docs/{catalog,customer,app,assistant,inventory}`, into `api/openapi/<service>.json` (pretty-printed and key-sorted so diffs are reviewable). Committed as its own commit: `chore(api): regenerate from backend <tag>`.
- `npm run api:generate`: `openapi-typescript` for each snapshot into `src/api/generated/<service>.ts`. Generated files are never edited by hand.
- `npm run api:check`: fetches the live documents from the running (pinned) backend and diffs them against the snapshots; fails on any difference. It runs as the first step of `npm run e2e`, so a silent backend change fails the build.
- `src/api/client.ts`: one `openapi-fetch` client per service, all on the relative base `/api` (through the proxy), with middleware that: attaches `Authorization: Bearer` when a session exists (a provider injected in Phase 11; empty now); sends a new `X-Correlation-Id` per request; maps every failure to one `ApiError` type `{ status, message, correlationId, retryAfter? }` from the backend's `{status, message}` body and headers.
- Field errors: a helper that splits a 400 `message` on `"; "` and matches each part's leading field name (the guide's section 4 rule), for Phase 10's forms.
- Retry policy in one place: never retry a mutation (and never `POST /api/orders`, the guide's rule); retry a GET once on 429 after a short back-off (`Retry-After` when present); once on a network error; never on other 4xx.
- Access rules come from the guide's tables, not the documents (web KI-011: the assistant and inventory documents carry no security markers).
- Replace Phase 1's hand-written type with the generated one; MSW handlers typed from the generated types, so a wrong mock shape fails to compile.
- Tests: error mapping for 400 (fields), 401, 403, 404, 409, 429 (retried once, GETs only), 500 (correlation id kept), network failure; `api:check` fails on a changed snapshot.

**Concepts to understand**
- OpenAPI as a contract between two repositories; snapshot plus drift check
- Generated types versus runtime truth
- Idempotency: which requests are safe to retry, and why checkout never is

**Done when**
- A field renamed in a snapshot fails `npm run verify` at compile time (shown, then reverted), and `api:check` passes against the pinned backend.

**Not in this phase:** caching and loading states (Phase 8).

## E2E additions (`e2e/`)

`npm run e2e` starts with `npm run api:check`; a drifted snapshot fails the run.

## Your manual steps (user)

Keep the backend running at the pinned tag.
