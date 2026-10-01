# API layer

Every call to the backend is typed from the backend's own OpenAPI documents. The chain is: the **live backend** → a committed **snapshot** → **generated types** → one **client** → the features. A backend change shows up as a failing check or a compile error, never as a broken page.

```
GET /v3/api-docs/<service>  --api:snapshot-->  api/openapi/<service>.json  --api:generate-->  src/api/generated/<service>.ts
        ^                                              |                                              |
        +-------------------- api:check (diff) --------+                       src/api/client.ts <----+ (types only)
```

The five services are `catalog`, `customer`, `app`, `assistant` and `inventory`: the gateway serves each document at `http://localhost:8080/v3/api-docs/<service>`.

## Commands

| Command | What it does |
|---|---|
| `npm run api:snapshot` | downloads the five documents into `api/openapi/`, pretty-printed and key-sorted so a git diff shows only real changes. Fetches all five before writing any. Commit the result alone, as `chore(api): regenerate from backend <tag>` |
| `npm run api:generate` | `openapi-typescript` on each snapshot into `src/api/generated/<service>.ts`. Never edit those files; they are ignored by ESLint and Prettier |
| `npm run api:check` | fetches the live documents and compares them with the snapshots; exit 1 and a "first difference at line N" report on any difference. It is the first step of `npm run e2e` (and so of the CI `e2e` job) |

When the backend pin moves: start the stack at the new tag, `api:snapshot`, `api:generate`, read the diff, fix what no longer compiles, and commit the snapshot alone.

## Why a snapshot at all

The documents are the contract between two repositories. Generating types from the *live* backend on every build would make the build depend on a running server and change under your feet; generating from a committed snapshot makes a backend change a reviewable commit. `api:check` is the alarm that says the snapshot is stale.

## Generated types versus runtime truth

A type is a promise the compiler cannot verify against a server. Two places where this app narrows the gap:

- **Response properties are present.** The backend marks no response property as required, so a plain generation makes every field optional. `scripts/openapi.ts` (`assumeResponsePropertiesPresent`) generates from a copy of each snapshot where every response schema lists all its properties as required (request schemas keep the backend's own `required`). Backend KI: web KI-016. `e2e/api-contract.spec.ts` checks the live products really carry every property.
- **The compiler is the drift detector.** The MSW fixtures in `src/test/msw/handlers.ts` are typed from the generated types, so a renamed or removed field fails `npm run verify` at `tsc` (shown in the Phase 7 test report).

## The client (`src/api/client.ts`)

`createApiClient<Paths>()` builds an `openapi-fetch` client for one document's paths; `catalogApi`, `customerApi`, `appApi`, `assistantApi` and `inventoryApi` are the shared instances. The documents' paths already start with `/api`, so the base URL is the page's own origin: calls go through the same-origin proxy (Vite in dev and preview, nginx in the image).

Every call passes through one middleware:

| Step | Rule |
|---|---|
| Request | `X-Correlation-Id` (a new UUID per call, when `crypto.randomUUID` exists) and `Accept: application/json`; `Authorization: Bearer <token>` on **every** call while someone is signed in (web KI-011: the assistant and inventory documents mark no call as protected). The token comes from `setAccessTokenProvider(fn)`, injected by Phase 11; until then it is `null` |
| Response, non-2xx | rejects with an `ApiError` |
| Network failure | rejects with an `ApiError` of status 0 and the id it sent |
| Aborted request | the browser's own `AbortError`, untouched, so callers can tell cancelling from failing |

`ApiError` (`src/api/errors.ts`) is `{ status, message, correlationId, retryAfter? }`: `message` is the backend's `message` when it sent one (safe to show), else a generic sentence; `correlationId` is the response's `X-Correlation-Id`, else the one sent (show it on 5xx and network failures); `retryAfter` is the `Retry-After` header in seconds (login throttling, Phase 33).

## Retry policy (`src/api/retry.ts`, the only place)

| Case | What happens |
|---|---|
| Any method other than GET (including `POST /api/orders`) | never retried. A lost response to a POST does not mean nothing happened; the guide says to re-read `GET /api/orders` first |
| GET, network failure | once, after 500 ms |
| GET, `429` | once, after the `Retry-After` the server gave (1 s if none); a `Retry-After` over 5 s is not waited out: the caller gets the `429` and `retryAfter` |
| Any other status, 4xx or 5xx | never |
| Aborted request | never |

The retry sends the same headers, so both attempts carry one correlation id. The login `429` (a POST) is therefore never retried by the client: the form shows the countdown (Phase 11, `docs/backend/phase-33-delta.md`).

## Field errors (`src/api/fieldErrors.ts`)

A 400's `message` joins every rejected field with `"; "`, each part starting with the field name. `splitFieldErrors(message, ['username', 'password', 'fullName'])` returns `{ fields, other }`: the sentence for each field, and any part that names none (shown above the form). Field names must match whole words. Phase 10's forms use it.

## Access rules (`src/api/access.ts`)

`accessFor('POST', '/api/orders')` returns `'customer'`; the roles are `anyone`, `signed-in`, `customer`, `admin`, copied from the guide's tables because the documents cannot say. Every path is typed against the generated `paths`, so a path that leaves a document stops compiling; `access.test.ts` checks the table against the committed snapshots, so a new operation without a rule fails. Operations that are service-to-service (and one the guide does not mention) are listed in `notForTheFrontend`.

## Tests

`scripts/openapi.test.ts` (formatting, drift, the required-properties step, the committed snapshots are canonical), `src/api/*.test.ts` (error mapping for 400, 401, 403, 404, 409, 429, 500, network failure; the retry policy; field errors; `Retry-After`; access rules), `e2e/api-contract.spec.ts`.
