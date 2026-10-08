# EcomDemo Frontend Integration Guide

Sep 30, 2026 · @Sujay Patil

## Overview

A frontend talks to exactly one host: the API gateway, `http://localhost:8080` locally (`http://localhost:18080` on the kind cluster). Every business endpoint lives under `/api`, returns JSON, and is described live by the Swagger UI at `/swagger-ui.html` on that same host.

The backend is EcomDemo: a Java 21 / Spring Boot 4 system split into a gateway and seven services. A frontend never calls a service directly; the gateway authenticates the token, applies rate limits, and routes by path.

| Environment | Base URL | How it runs |
| --- | --- | --- |
| Local (compose) | `http://localhost:8080` | `docker compose up --build --wait` |
| Local Kubernetes (kind) | `http://localhost:18080` | `scripts/k8s-up.sh` |
| Production | none yet | no deployment exists; plan for a configurable base URL |

How to read this guide: sections 2-4 are the rules every call follows, section 5 maps screens to calls, sections 6-7 are the endpoint reference, section 8 covers what goes wrong, and sections 10-13 set out how the frontend team works: the same rules as the backend, its own repository, and its own phases from Phase 0. The live Swagger documents (section 9) are the source of truth when this guide and the code disagree.

## Architecture as the frontend sees it

The gateway is the only door: it checks the token and role, rate-limits, and forwards each `/api` prefix to the service that owns it. Payment and notification have no public API; they take part in checkout through Kafka events.

&#91;embedded content: what a frontend can reach · 1 gateway, 5 routed services\]

A request that the gateway refuses (`401`, `403`, `429`) never reaches a service. The same role rules are repeated inside each service, so a response from any service follows the conventions in section 4.

## Authentication and authorization

Log in with `POST /api/auth/login`, keep the returned `accessToken` in memory, and send it as `Authorization: Bearer <token>` on every protected call. The token lives 15 minutes and there is no refresh endpoint, so the frontend must send the user back to login when it expires.

**Register** (`POST /api/customers/register`, public) creates a CUSTOMER account and returns `201` with a `CustomerResponse`. It does not log the user in: call login next.

| Field | Rule |
| --- | --- |
| `username` | 3-50 characters; letters, digits, `.` `_` `-` only; unique |
| `password` | 8-72 characters; no symbol or digit rules |
| `fullName` | required, at most 100 characters |

**Login** (`POST /api/auth/login`, public) takes `{"username", "password"}` and returns a `TokenResponse`:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "expiresAt": "2026-09-22T09:30:00Z"
}
```

**The token** is a signed JWT (HS256). Its payload is readable without the key, so the UI can decode it for display: `sub` = username, `uid` = user id, `roles` = `["CUSTOMER"]` or `["ADMIN"]`, `exp` = expiry. Decoding is for showing or hiding UI only; the server re-checks every call.

| Role | How an account gets it | What it unlocks |
| --- | --- | --- |
| Anonymous | no token | browse and search products, register, log in |
| CUSTOMER | registration | own profile, own cart, checkout, own orders, shopping assistant |
| ADMIN | seeded by a database migration only; never through the API | product and stock management, batch import, dead-letter replay, operations endpoints |

**401 vs 403.** `401` means no valid identity (no token, tampered, or expired): clear the token and go to login. `403` means the identity is valid but not allowed (a customer on an admin page): show "not permitted", never a login prompt.

Frontend rules that follow from this design:

- Store the token in memory (or `sessionStorage` if a reload must survive). Avoid `localStorage`: any script injected into the page can read it.
- Schedule a warning or silent logout from `expiresAt`; an expired token cannot be refreshed or revoked.
- Logging out is client-side only: drop the token. There is no server logout (KI-017).
- A password change endpoint does not exist yet (KI-018).

## Conventions every call follows

Every request and response body is JSON (`Content-Type: application/json`), except the admin CSV upload. Every failure, from any service, has the same two-field shape, so one error handler covers the whole API.

```json
{ "status": 400, "message": "fullName must not be blank; password must be between 8 and 72 characters" }
```

| Topic | Rule | What the frontend does |
| --- | --- | --- |
| Base path | everything under `/api` on the gateway | one configurable `API_BASE_URL` |
| Errors | `ApiError` = `{status, message}`; validation joins all field errors into one `message`, ` ;  `-separated | show `message`; for forms, split on ` ;  ` and match the leading field name |
| Money | JSON numbers with 2 decimals (`8999.00`); totals are computed by the server | never add prices in JS for display totals; show `lineTotal` and `totalAmount` as returned |
| Currency | not modelled; one implicit currency | pick one symbol in the UI (open question for product) |
| Timestamps | ISO-8601 UTC (`2026-09-22T09:30:00Z`) | format in the user's time zone |
| Ids | 64-bit integers, except assistant ids (UUID strings) | treat as opaque |
| Pagination | none; `GET /api/products` returns the whole catalogue (KI-007) | page and filter client-side for now |
| Methods | `GET`, `POST`, `PUT`, `DELETE`; no `PATCH` | `PUT` replaces the whole resource |
| Correlation id | every response carries `X-Correlation-Id`; you may send your own | log it with any error a user reports; it finds the request in the backend logs |
| Rate limit | 50 requests/s refill, burst 100, per logged-in user (per IP when anonymous); headers `X-RateLimit-Remaining`, `-Burst-Capacity`, `-Replenish-Rate` | on `429`, back off and retry; never poll faster than every 1-2 s |
| Security headers | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` | the API cannot be framed; not a UI concern |

**CORS: use a same-origin dev proxy.** The gateway allows the origin `http://localhost:3000` (set `CORS_ALLOWED_ORIGINS` on the gateway to change it), headers `Authorization`, `Content-Type`, `X-Correlation-Id`, and exposes `X-Correlation-Id`. But as of 2026-09-30 the gateway answers every CORS preflight (`OPTIONS`) with `401`, so a browser on another origin cannot log in or send any authenticated request. Simple anonymous `GET`s work. Until that defect is fixed, proxy `/api` through the frontend dev server (Vite `server.proxy`, Next.js `rewrites`, CRA `proxy`) so the browser sees a single origin and sends no preflight at all. In production, serve the frontend and the gateway from one origin behind the same ingress.

## User journeys and screen flows

A storefront needs nine screens, and only checkout is asynchronous. Each row lists the calls a screen makes, in order.

| Screen | Who | Calls |
| --- | --- | --- |
| Home and product list | anyone | `GET /api/products`; filter and paginate client-side |
| Search results | anyone | `GET /api/products/search?q=...&limit=20`; fall back to filtering the list on `503` |
| Product detail | anyone | `GET /api/products/{id}`; "Add to cart" sends anonymous users to login first |
| Register and login | anyone | `POST /api/customers/register`, then `POST /api/auth/login`; `GET /api/customers/me` for the header |
| Cart | CUSTOMER | `GET /api/cart`; `POST /api/cart/items`, `PUT` or `DELETE /api/cart/items/{productId}`; render the returned cart |
| Checkout and confirmation | CUSTOMER | `POST /api/orders`, then poll `GET /api/orders/{id}/status` (diagram below) |
| My orders and order detail | CUSTOMER | `GET /api/orders`, `GET /api/orders/{id}` |
| Profile | CUSTOMER | `GET` and `PUT /api/customers/me` (display name only) |
| Assistant chat | CUSTOMER | `POST /api/assistant/chat`; confirm a proposed addition with `POST /api/assistant/actions/{id}/confirm` |

There is no server-side guest cart: a visitor can browse and search, but the cart needs a login. If you want a guest cart, keep it in the browser and replay it with `POST /api/cart/items` right after login.

&#91;embedded content: order lifecycle · 1 call, 3 states, 1 up-front refusal\]

Checkout empties the cart as soon as the order is accepted, whatever the outcome. The order is then settled by a saga: inventory reserves stock, payment charges, and the order becomes CONFIRMED, or CANCELLED with a `reason` to show the shopper.

## API contract reference (shopper)

These are the 17 endpoints a storefront uses, as the gateway enforces them; read from the live OpenAPI documents on 2026-09-30. `*` marks a required field.

### Catalogue (catalog-service)

| Method and path | Access | Request | Success | Errors |
| --- | --- | --- | --- | --- |
| `GET /api/products` | anyone | none | `200` `ProductResponse[]` (whole catalogue) | none |
| `GET /api/products/{id}` | anyone | none | `200` `ProductResponse` | `404` |
| `GET /api/products/search?q=&category=&minPrice=&maxPrice=&limit=` | anyone | `q`\* up to 200 chars; `category` up to 50; prices >= 0; `limit` 1-20, default 5 | `200` `ProductSearchResponse` | `400`; `503` when semantic search is not configured |

`ProductResponse` = `{id, name, description, price, stockQuantity, category|null}`. `ProductSearchResponse` = `{query, results: [{product: ProductResponse, similarity}]}`, ranked by meaning, not keywords: "something to type on" finds keyboards. `stockQuantity` is a display hint; the real check happens at checkout.

### Accounts (customer-service)

| Method and path | Access | Request | Success | Errors |
| --- | --- | --- | --- | --- |
| `POST /api/customers/register` | anyone | `{username*, password*, fullName*}` | `201` `CustomerResponse` | `400`, `409` username taken |
| `POST /api/auth/login` | anyone | `{username*, password*}` | `200` `TokenResponse` | `400`, `401` wrong credentials |
| `GET /api/customers/me` | signed in | none | `200` `CustomerResponse` | `401` |
| `PUT /api/customers/me` | signed in | `{fullName*}` up to 100 chars | `200` `CustomerResponse` | `400`, `401` |

`CustomerResponse` = `{id, username, fullName, role: CUSTOMER|ADMIN, createdAt}`.

### Cart (ecomdemo-app)

Each customer has exactly one cart, created on first use and emptied by checkout. Every cart call returns the whole updated cart, so re-render from the response.

| Method and path | Access | Request | Success | Errors |
| --- | --- | --- | --- | --- |
| `GET /api/cart` | CUSTOMER | none | `200` `CartResponse` | `401`, `403` |
| `POST /api/cart/items` | CUSTOMER | `{productId*, quantity*}` quantity >= 1; adds to an existing line | `200` `CartResponse` | `400`, `404` unknown product |
| `PUT /api/cart/items/{productId}` | CUSTOMER | `{quantity*}` >= 1; sets the line | `200` `CartResponse` | `400`, `404` not in cart |
| `DELETE /api/cart/items/{productId}` | CUSTOMER | none | `200` `CartResponse` | `404` not in cart |

`CartResponse` = `{id, items: [{productId, productName, unitPrice, quantity, lineTotal}], totalAmount}`. A line keeps the price it was added at, even if the catalogue price changes later; show `unitPrice` from the cart, not the product page. Adding does not check stock.

### Orders (ecomdemo-app)

| Method and path | Access | Request | Success | Errors |
| --- | --- | --- | --- | --- |
| `POST /api/orders` | CUSTOMER | none (checks out the whole cart) | `201` `OrderResponse` with `status: PENDING` | `409` empty cart, or "3 requested, 2 available" |
| `GET /api/orders` | CUSTOMER | none | `200` `OrderResponse[]` (own orders only) | `401`, `403` |
| `GET /api/orders/{id}` | CUSTOMER | none | `200` `OrderResponse` | `403` another customer's order, `404` |
| `GET /api/orders/{id}/status` | CUSTOMER | none | `200` `OrderStatusResponse` | `403`, `404` |

`OrderResponse` = `{id, placedAt, username, status: PENDING|CONFIRMED|CANCELLED, statusReason, statusChangedAt, totalAmount, items: [{productId, productName, unitPrice, quantity, lineTotal}]}`. `OrderStatusResponse` = `{orderId, status, reason|null, changedAt}`: the light call to poll.

### Shopping assistant (assistant-service)

| Method and path | Access | Request | Success | Errors |
| --- | --- | --- | --- | --- |
| `POST /api/assistant/chat` | CUSTOMER | `{message*, conversationId}` message up to 1000 chars; omit `conversationId` to start | `200` `AssistantReply` | `400`, `503` no model configured |
| `POST /api/assistant/actions/{actionId}/confirm` | CUSTOMER | none | `200` `ConfirmedAddition` | `404` unknown or expired action |

`AssistantReply` = `{conversationId, answer, sources: [{type, id, title}], toolsUsed: [string], pendingAction: {id, productId, productName, quantity, unitPrice}|null}`. Send the returned `conversationId` with the next message to keep context. The assistant never changes the cart by itself: when `pendingAction` is present, show a confirm button that calls `confirm` with its `id`. `ConfirmedAddition` = `{productId, productName, quantity, cartTotal}`; refresh the cart after it.

## Admin console APIs

An admin console needs 15 endpoints, all ADMIN-only at the gateway (a CUSTOMER token gets `403`). Build it as a separate area of the app, shown only when the token's `roles` contains `ADMIN`.

| Area | Method and path | Request | Success | Notes |
| --- | --- | --- | --- | --- |
| Products | `POST /api/products` | `ProductRequest` | `201` `ProductResponse` | `400` lists every invalid field |
| Products | `PUT /api/products/{id}` | `ProductRequest` (full replace) | `200` `ProductResponse` | `404` unknown id |
| Products | `DELETE /api/products/{id}` | none | `204` | `404` unknown id |
| Products | `POST /api/products/{id}/generate-description` | none | `200` `{productId, description, tags[], seoTitle, model, generatedAt}` | a draft for the admin to review, not saved; `503` no LLM configured |
| Search index | `POST /api/products/embeddings/backfill` | none | `202` `BackfillStatus` | re-indexes every product for semantic search |
| Search index | `GET /api/products/embeddings/backfill/{executionId}` | none | `200` `BackfillStatus` | poll for progress |
| Stock | `GET /api/inventory?productIds=1,2,3` | ids, comma-separated | `200` `[{productId, quantity}]` |  |
| Stock | `GET /api/inventory/{productId}` | none | `200` `{productId, quantity}` |  |
| Stock | `PUT /api/inventory/{productId}` | `{quantity*}` >= 0 | `200` `{productId, quantity}` | sets the level, not a delta |
| Import | `POST /api/admin/batch/product-import` | `multipart/form-data`, field `file` = CSV | `200` `{execution, inputFile, errorFile}` | runs to completion before answering |
| Import | `GET /api/admin/batch/executions/{id}` | none | `200` `JobExecutionResponse` | `status`, `readCount`, `writeCount`, `skipCount`, `failureMessage`, per-step detail |
| Import | `POST /api/admin/batch/executions/{id}/restart` | none | `200` `ProductImportResponse` | `409` if it cannot be restarted |
| Saga support | `GET /api/admin/dead-letters` | none | `200` `DeadLetterView[]` | `{topic, partition, offset, key, timestamp, originalTopic, exceptionClass, exceptionMessage, payload, replayed}` |
| Saga support | `POST /api/admin/dead-letters/{topic}/{partition}/{offset}/replay` | none | `200` `ReplayView` | `409` already replayed (KI-040: also after Kafka offsets restart) |
| Saga support | `GET /api/admin/dead-letters/replays` | none | `200` `ReplayView[]` | the audit log: who replayed what, when |

`ProductRequest` = `{name*, description, price*, stockQuantity*, category}`: `name` up to 255 characters, `description` up to 1000, `price` >= 0.01 with at most 2 decimals, `stockQuantity` >= 0, `category` up to 50 (optional).

The CSV import expects a header row and the columns `name,description,price,stock_quantity,category`, in that order:

```csv
name,description,price,stock_quantity,category
Mechanical Keyboard,"Hot-swappable switches, PBT keycaps",8999.00,25,PERIPHERALS
USB-C Hub,7-in-1,2499.00,40,ACCESSORIES
```

Bad rows are skipped, not fatal: show `skipCount` and offer the `errorFile` path to the admin. The dead-letter screens are an operations tool; most shops can ship without them at first.

`POST /api/products/batch` and inventory's `reserve`, `release` and `orders/{id}/close` also appear in the documents. They are service-to-service calls used by the import and the order saga; a frontend never calls them.

## Errors, edge cases and UX guidance

The one behaviour most frontends get wrong here is checkout: `201` means "order received", not "order confirmed". Stock and payment are settled afterwards by the order saga, so the UI must wait for `CONFIRMED` or `CANCELLED` before it says "thank you".

| Situation | What the API does | What the UI should do |
| --- | --- | --- |
| Order placed | `201`, `status: PENDING`; usually settles in 1-6 s | show "placing your order"; poll `GET /api/orders/{id}/status` every 1-2 s |
| Order confirmed | status `CONFIRMED` | show the confirmation; stop polling |
| Not enough stock at checkout | `409` immediately, e.g. "Insufficient stock for 'Mouse': requested 3, available 2"; the cart is kept | show the message next to the line; offer to lower the quantity |
| Stock taken by someone else a moment later | order `CANCELLED`, `reason` = the same insufficient-stock message | explain, and point back to the product |
| Payment declined | order `CANCELLED`, `reason` e.g. "Payment declined: 12000.00 exceeds the limit of 10000.00" | show `reason`; payment is simulated and declines totals above 10 000.00 |
| Order still PENDING after about 1 minute | the backend's saga deadline reconciles it (swept every 10 s) and it ends CONFIRMED or CANCELLED | after \~15 s say "taking longer than usual"; keep polling, then stop at \~90 s and link to the orders page |
| Cancelled order | the cart is NOT restored (KI-019) | offer "add these items to my cart again" from the order's `items` |
| Empty cart checkout | `409` "Cannot place an order: the cart is empty" | disable the checkout button when the cart is empty |
| Token expired mid-session | `401` | keep the page's state, send to login, return after |
| Wrong role | `403` | "not permitted"; never a login loop |
| Validation | `400`, all field errors in one `message` | show beside the form fields; the rules are in sections 3, 6 and 7 |
| Not found | `404` with a sentence | product page: "no longer available" |
| Rate limited | `429` | retry after a short back-off |
| Assistant or semantic search not configured | `503` | hide the feature or fall back to the plain product list |
| Backend down | `5xx` or network error | a retry button; show `X-Correlation-Id` in a support detail if you have it |

Two more rules. Never retry `POST /api/orders` automatically: a lost response does not mean no order was made, so re-read `GET /api/orders` first. And prices in the cart are fixed when added, so a product page may show a newer price than the cart line: label the cart as "price when added".

## Local setup, tooling and known gaps

Run the backend with Docker, point the dev server's proxy at `http://localhost:8080`, and generate typed clients from the live OpenAPI documents instead of hand-writing request types.

1. Clone the repo, create `.env` as the README describes (it holds `JWT_SECRET` and the optional AI settings; never commit it).
2. `docker compose up --build --wait` (about 2 minutes cold). The gateway is on `8080`.
3. Proxy `/api` from your dev server to `http://localhost:8080` (see the CORS note in section 4).
4. Register a customer through the UI or `POST /api/customers/register`. The ADMIN account is seeded by a migration; its credentials are in the README.
5. Explore at `http://localhost:8080/swagger-ui.html`: pick a service top-right, log in through customer-service, paste the token into **Authorize**.

Typed clients, one per document (TypeScript example):

```bash
for s in catalog customer app assistant inventory; do
  npx openapi-typescript http://localhost:8080/v3/api-docs/$s -o src/api/$s.d.ts
done
```

The documents' security markers are incomplete: assistant and inventory operations show no padlock, but the gateway requires CUSTOMER and ADMIN respectively. Section 6 and 7 tables state the access the gateway enforces.

### Gaps that shape the UI

| Gap | Effect on the frontend | Tracked as |
| --- | --- | --- |
| CORS preflight answers `401` | no cross-origin browser calls with a token; use a same-origin proxy | not yet logged (found 2026-09-30) |
| No product images | no image URL in `ProductResponse`; use placeholders or a frontend-side image map | not tracked |
| No pagination or sorting | `GET /api/products` returns everything; paginate client-side | KI-007 |
| No category list endpoint | `category` is free text; derive the filter list from the loaded products | not tracked |
| No refresh token or server logout | re-login every 15 minutes; logout = drop the token | KI-017 |
| No password change | no "change password" screen yet | KI-018 |
| Cart not restored after a cancelled order | offer "add again" from the order's items | KI-019 |
| No shipping address, delivery or customer order cancellation | checkout is one click with no address step; orders cannot be cancelled by the shopper | not tracked |
| No currency field | one implicit currency; choose the symbol in the UI | not tracked |
| No push for order status | poll the status endpoint; server-sent events are a candidate | KI-022 |
| Swagger UI is always on | fine for development; production needs a profile to switch it off | KI-027 |

## Working model: the same rules, a new team

The frontend is built in its own GitHub repository, `ecomdemo-web`, by its own team, with its own phase numbers starting at Phase 0. Everything else is copied from the backend: one technology per phase, one branch and one PR per phase, a checkpoint file, a known-issues register, and nothing merged without the user's words.

### Repository layout (mirrors the backend)

| Path in `ecomdemo-web` | Backend equivalent | Purpose |
| --- | --- | --- |
| `CLAUDE.md` | `CLAUDE.md` | hard rules, session start, where things are, conventions (starter in the last section) |
| `docs/ROADMAP.md` | same | the phase tracker: # · Phase · Technology · Branch · Status |
| `docs/phases/phase-XX-<slug>.md` | same | one file per phase: scope, concepts, Done when, E2E additions, manual steps |
| `docs/KNOWN_ISSUES.md` | same | defects, gaps, candidates; same triage (Fix, Phase N, Candidate, Accepted, Needs check) |
| `docs/progress/CURRENT.md` | same | the in-phase checkpoint, under \~60 lines, committed at every step and before every stop |
| `docs/progress/RECENT.md` | same | summaries of the last two phases |
| `docs/decisions.md` | same | `[Phase N] Decision: … \| Reason: … \| Alternatives considered: …` one line each |
| `docs/process/execution-protocol.md`, `git-workflow.md`, `testing-protocol.md`, `context-management.md`, `development-environment.md` | same five files | lifecycle, git rules, testing, what to load, machine setup; copied, with Maven replaced by npm |
| `docs/architecture/` | same | how the app is organised: routing, state, API layer, auth flow |
| `docs/modules/` | same | one page per feature folder (catalog, auth, cart, checkout, orders, assistant, admin) |
| `docs/test-reports/phase-XX.md` | same | what was run and what it showed, per phase |
| `src/features/<feature>/` | `com.ecomdemo.<feature>` | package-by-feature: each feature owns its pages, components, hooks and tests |
| `src/api/generated/` | the backend's OpenAPI documents | generated types, never edited by hand |
| `e2e/` | `scripts/smoke-test.sh` | Playwright tests against the running backend; every phase adds checks, none are removed |

### Hard rules (identical in meaning to the backend's)

1. Every unit of work gets its own branch from the latest `main`: `feature/phase-XX-<slug>`, `fix/ki-XXX-<slug>`, or `chore/<slug>` (only when the user asks).
2. When a phase or fix is complete: push, open a PR to `main`, then **stop** for the user's review.
3. Never merge unless the user says `approved, merge it`. Merge commits only (`gh pr merge --merge`), never squash or rebase.
4. Start the next phase only after the user says to continue **and** merge verification proves every change is in `main`. One open PR at a time.
5. Never delete a branch, local or remote.
6. Never commit to `main` (except the Phase 0 bootstrap commit), never force-push, never rewrite history.
7. Implement only the current phase's scope. A defect found on the way goes into `docs/KNOWN_ISSUES.md`; it is not fixed in passing.
8. Never disable or delete tests to get green. Never report a check as passed without running it.
9. Never put secrets in code, commits, PRs or chat.

The user commands are the same too: `merged, continue`, `merged, stop`, `approved, merge it`, `changes: <feedback>`, `plan first`, `status`, `fix KI-XXX`, `issues`, `stop`, `done`. Completion tags are `phase-XX-complete` and `ki-XXX-fixed`, on `main`, after verification.

### Commands that replace the backend's

| Backend | Frontend | What it must include |
| --- | --- | --- |
| `./mvnw clean verify` | `npm ci && npm run verify` | type check, lint, unit and component tests, production build; zero failures |
| `scripts/smoke-test.sh` | `npm run e2e` | Playwright against the real backend (compose, gateway on 8080) and the built app; grows every phase |
| `docker compose up` | `docker compose up` in the backend repo at its pinned tag, then `npm run dev` | the app must start with no console errors |

Merge verification is the backend's checklist unchanged: PR merged with a merge commit, branch an ancestor of `main`, no missing commits, no diff, branch still present, `npm run verify` and `npm run e2e` pass on `main`, CI green, then the tag.

&#91;embedded content: the phase cycle · 9 steps, 2 stops for the user\]

The two highlighted boxes are the only places work waits, and both wait for the user's words: a merge, then `continue`.

## Frontend roadmap: Phase 0 to 23

The frontend roadmap has 24 phases in six stages, one technology per phase, in the same order the backend learned things: foundation and tests first, features on a typed API next, delivery and hardening last. It is a proposal: the team edits this table, and `docs/ROADMAP.md` in `ecomdemo-web` becomes its copy.

| # | Phase | Technology | Branch | Stage | Needs from the backend | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Repository Bootstrap | Git + GitHub + GitHub CLI | `main` | Foundation | none | Not started |
| 1 | Baseline App | Vite + React + TypeScript (strict) | `feature/phase-01-baseline-app` | Foundation | product list from `GET /api/products` via the dev proxy | Not started |
| 2 | Automated Testing | Vitest + Testing Library + MSW | `feature/phase-02-testing` | Foundation | none (the API is mocked) | Not started |
| 3 | End-to-End Smoke Tests | Playwright | `feature/phase-03-playwright` | Foundation | backend compose stack at the pinned tag | Not started |
| 4 | Code Quality | ESLint + Prettier | `feature/phase-04-code-quality` | Foundation | none | Not started |
| 5 | Continuous Integration | GitHub Actions | `feature/phase-05-github-actions` | Foundation | backend images for the E2E job (GHCR) | Not started |
| 6 | Routing | React Router | `feature/phase-06-routing` | Application shell | none | Not started |
| 7 | Typed API Client | openapi-typescript + openapi-fetch | `feature/phase-07-api-client` | Application shell | the five `/v3/api-docs/<service>` documents | Not started |
| 8 | Server State | TanStack Query | `feature/phase-08-server-state` | Application shell | none | Not started |
| 9 | Design System | Tailwind CSS + Radix primitives | `feature/phase-09-design-system` | Application shell | none | Not started |
| 10 | Forms and Validation | React Hook Form + Zod | `feature/phase-10-forms` | Application shell | validation rules in sections 3, 6 and 7 | Not started |
| 11 | Authentication | JWT in memory + route guards | `feature/phase-11-auth` | Shopping | login, register; no refresh token (KI-017) | Not started |
| 12 | Cart | Mutations + cache invalidation | `feature/phase-12-cart` | Shopping | cart API | Not started |
| 13 | Checkout and Order Tracking | Polling a saga (status state machine) | `feature/phase-13-checkout` | Shopping | orders API; saga deadline | Not started |
| 14 | Orders and Profile | Nested routes + detail views | `feature/phase-14-orders-profile` | Shopping | no password change (KI-018) | Not started |
| 15 | Semantic Search | Debounced search + URL state | `feature/phase-15-search` | Shopping | search endpoint; `503` when not configured | Not started |
| 16 | AI Shopping Assistant | Chat UI + confirm-before-act | `feature/phase-16-assistant` | Shopping | assistant needs an LLM configured | Not started |
| 17 | Admin Console | Role-gated area + file upload | `feature/phase-17-admin` | Admin | ADMIN endpoints (section 7) | Not started |
| 18 | Accessibility | axe-core + keyboard testing (WCAG 2.2 AA) | `feature/phase-18-accessibility` | Quality | none | Not started |
| 19 | Containerization | Docker + nginx (same-origin proxy to the gateway) | `feature/phase-19-docker` | Delivery | CORS preflight fix, or same-origin serving | Not started |
| 20 | Container Orchestration | Kubernetes (the backend's kind cluster and ingress) | `feature/phase-20-kubernetes` | Delivery | backend k8s manifests and ingress | Not started |
| 21 | Performance | Lighthouse CI + bundle budgets | `feature/phase-21-performance` | Quality | none | Not started |
| 22 | Security | CSP + npm audit + Trivy | `feature/phase-22-security` | Quality | none | Not started |
| 23 | Observability | Error reporting + trace propagation | `feature/phase-23-observability` | Quality | `X-Correlation-Id`; backend tracing (Tempo) | Not started |

Stack assumption: React with TypeScript on Vite, because it is the most common pairing and every later tool in the table supports it. If the team picks another framework (Angular, Vue, Next.js), keep the phase order and swap the Technology column.

Every phase file uses the backend's template: Stage, Technology, Branch, PR title `Phase XX: <Technology>`, Requires `phase-(XX-1)-complete`, completion tag, then What you'll implement, Concepts to understand, Done when, Not in this phase, E2E additions and Your manual steps (starter in the last section). Tests are not a late phase: from Phase 2 every phase adds unit tests, and from Phase 3 every phase adds Playwright checks.

## Working with the backend team

The two teams share nothing but the API contract: the frontend never edits the backend repository, and it asks for backend changes through the backend's known-issues register. Each repository keeps its own phases, fixes, tags and single open PR.

| Topic | Rule |
| --- | --- |
| The contract | the five documents at `/v3/api-docs/<service>` on the gateway. The frontend commits a snapshot in `api/openapi/<service>.json` and generates types from it (Phase 7). Regenerating is its own commit: `chore(api): regenerate from backend <tag>` |
| Pinned backend version | `docs/process/development-environment.md` names the backend tag the frontend builds and tests against (today `ki-001-fixed`). Moving to a newer tag is a deliberate commit in a phase or fix, with `npm run verify` and `npm run e2e` rerun |
| Contract drift | `npm run api:check` fetches the live documents from the pinned backend and diffs them against the snapshot; it runs in the E2E step, so a silent backend change fails the frontend build instead of production |
| Asking for a backend change | tell the user, naming the frontend phase that needs it (the frontend has read-only access, so it opens no issues or PRs there); the user adds it to its `docs/KNOWN_ISSUES.md` (a defect, triage Fix) or its roadmap (a new capability, Candidate or a phase). The frontend never works around it silently: its own `KNOWN_ISSUES.md` gets a row pointing at the backend issue |
| Naming across repositories | KI numbers restart at KI-001 in each repository, so a cross-reference always names the repository: "backend KI-041", "web KI-003" |
| Dependencies between phases | a frontend phase file lists any backend dependency under **Requires**, next to `phase-(XX-1)-complete`, for example `backend tag ki-041-fixed`. If it is missing, that phase does not start: STOP and ask, as with any other broken rule |
| Backend changes already planned | backend Phase 33 (auth hardening) moves token signing to an asymmetric key (RS256 or ES256) with a JWKS endpoint, and throttles repeated failed logins. The frontend impact is small: the token stays an opaque Bearer string, but `POST /api/auth/login` can answer `429` with a `Retry-After` header, which the login form must show as a wait time |
| Shared environment | the backend's compose stack and kind cluster are the frontend's test environment. The frontend adds its own containers (Phase 19) and its own ingress path (Phase 20); it never changes the backend's `compose.yaml` or `k8s/` |

### Read-only access to the backend repository

When this guide or the API documents leave a question open, the frontend team and its Claude Code read the answer straight from the backend repository, [github.com/mr-sujay-patil/ecomdemo](https://github.com/mr-sujay-patil/ecomdemo). It is public, so no invitation is needed, and it is never given write access: nobody from the frontend is added as a collaborator.

| Allowed (read) | Never (write) |
| --- | --- |
| a clone at `../ecomdemo-backend-readonly`, checked out at the pinned tag: `git clone https://github.com/mr-sujay-patil/ecomdemo ../ecomdemo-backend-readonly && git -C ../ecomdemo-backend-readonly checkout ki-001-fixed` | commits, branches or pushes to it; edits to any file in `../ecomdemo-backend-readonly` |
| `git -C ../ecomdemo-backend-readonly fetch --tags` and a checkout of a newer tag, when the pinned version moves | pull requests, issues, comments or reviews on the backend repository |
| `gh api repos/mr-sujay-patil/ecomdemo/contents/<path>?ref=<tag>`, `gh pr view <n> -R mr-sujay-patil/ecomdemo` | copying backend code into the frontend (read it to understand the contract; build from the generated types) |

Where to look first, in this order:

1. The API documents at `/v3/api-docs/<service>`, then this guide.
2. `docs/KNOWN_ISSUES.md` (is it a known gap?) and `docs/decisions.md` (`grep` it: why is it like this?).
3. The controller and DTO for the endpoint: `<service>/src/main/java/com/ecomdemo/**/*Controller.java` and its `dto/` records carry the validation rules and error cases.
4. The integration tests next to it (`*IT.java`): they show real requests and the responses the backend promises.
5. `docs/phases/` and `docs/architecture/saga.md` for behaviour over time, such as the order saga.

Always read at the pinned tag, not `main`, so the answer matches the backend the frontend runs against.

Read-only is enforced, not just agreed: GitHub rejects pushes from anyone who is not a collaborator, and the clone's push URL is disabled as a second lock (`git -C ../ecomdemo-backend-readonly remote set-url --push origin no-push`), so even a mistaken `git push` there fails locally. An answer that contradicts the documents or this guide is a finding: record it in the frontend's `KNOWN_ISSUES.md` and tell the user.

Never use the backend team's own working copy (on the user's machine, `~/projects/ecomdemo`) as the reference: checking out a tag there would move their work. The read-only clone has its own folder. Its `compose.yaml` uses the same container names and ports as the backend team's, so only one backend stack runs at a time: if `docker ps` already shows `ecomdemo-gateway-service`, use that stack and do not start a second one.

Backend issues the frontend already needs, in the order they bite:

- [ ] CORS preflight answers `401` (section 4): not blocking while the dev proxy and same-origin serving are used; blocking for any cross-origin deployment. To be logged as backend KI-041.
- [ ] No product image field: decide with the backend team before the Design System phase (Phase 9) whether images come from the API.
- [ ] No pagination (backend KI-007): acceptable until the catalogue grows past a few hundred products.
- [ ] Security markers missing in the assistant and inventory documents: cosmetic, but generated clients cannot tell which calls need a token.

## Starter files for `ecomdemo-web`

Phase 0 commits these two files, plus the five `docs/process/` files copied from the backend with Maven swapped for npm, directly to `main`. It is the only direct commit the rules allow.

**`CLAUDE.md`**

```markdown
# CLAUDE.md: EcomDemo Web

The storefront and admin console for the EcomDemo backend, built by a separate team,
**one technology per phase**. The user is learning; explain the "why" behind decisions.

**Stack:** TypeScript (strict) · React · Vite · npm · Git + GitHub (`gh`)
**Backend:** the gateway only (`http://localhost:8080`), pinned to the backend tag in
`docs/process/development-environment.md`. Backend source for questions: `../ecomdemo-backend-readonly`, a clone of
https://github.com/mr-sujay-patil/ecomdemo at the pinned tag. READ-ONLY: read it to answer doubts
(docs/KNOWN_ISSUES.md, docs/decisions.md, controllers, DTOs, *IT.java); never edit, commit,
push, or open PRs or issues there. A backend change is requested through the user.

## 🔴 Hard rules (never break; if a rule can't be followed, STOP and ask)

1. Every unit of work gets its own branch cut from the latest `main`:
   a phase → `feature/phase-XX-<slug>`; a defect from `docs/KNOWN_ISSUES.md` → `fix/ki-XXX-<slug>`;
   a process or docs change outside both → `chore/<slug>` (only when the user asks).
2. When the phase or fix is complete: push and raise a PR to `main`, then **STOP** for review.
3. **Never merge** unless the user says `approved, merge it`. Merge commits only.
4. Start the next phase or fix only after the user says to continue **and** merge verification
   proves every change is in `main`. One open PR at a time.
5. **Never delete any branch** (local or remote).
6. **Never commit to `main`** (except the Phase 0 bootstrap commit). Never force-push or rewrite history.
7. Implement **only** the current phase's scope. A defect found on the way goes into
   `docs/KNOWN_ISSUES.md`; a backend defect is reported to the user, never worked around silently.
8. Never disable or delete tests to get green. Never report a check as passed without running it.
9. Never put secrets in code, commits, PRs, or chat.

## 🔁 Session start (always)

Git state → `docs/progress/CURRENT.md` → `docs/progress/RECENT.md` → **only** the current
`docs/phases/phase-XX-*.md` (or, for a fix, only its row and detail in `docs/KNOWN_ISSUES.md`).

## 📂 Where things are

Same table as the backend: execution-protocol, git-workflow, testing-protocol,
context-management, development-environment, phases, KNOWN_ISSUES, CURRENT, RECENT,
decisions (`grep`, don't load in full), ROADMAP (edit the tracker row only).

## ✍️ Conventions

- Package-by-feature under `src/features/<feature>/`; shared UI in `src/components/`
- API types come only from `src/api/generated/` (never hand-written); one API client module
- Server state in the query cache, not in component state; the token in memory only
- Money: display the server's `lineTotal` and `totalAmount` with `Intl.NumberFormat`; never sum in JS
- Every screen handles loading, empty and error states; `ApiError.message` is shown to the user
- Conventional Commits; stable, current releases of every dependency
- Build: `npm ci && npm run verify` · E2E smoke: `npm run e2e` (backend running)
```

**`docs/phases/phase-01-baseline-app.md`** (the template, filled for Phase 1)

```markdown
# Phase 1: Baseline App

| | |
|---|---|
| **Stage** | Stage 1: Foundation |
| **Technology** | Vite + React + TypeScript (strict) |
| **Branch** | `feature/phase-01-baseline-app` |
| **PR title** | `Phase 01: Baseline App` |
| **Requires** | `phase-00-complete` on `main`; backend running at the pinned tag |
| **Completion tag** | `phase-01-complete` |

**Goal:** a running app that shows real products from the backend.

**What you'll implement**
- A Vite + React + TypeScript project with `strict: true`, and `npm run verify` (type check + build).
- A dev-server proxy from `/api` to `http://localhost:8080`.
- A product list page that calls `GET /api/products` and shows name, price and category,
  with loading, empty and error states (`ApiError.message`).

**Concepts to understand**
- What a bundler and a dev server do, and why the proxy avoids CORS
- TypeScript's strict mode
- Components, props and state

**Done when**
- `npm run verify` passes and the page lists the seeded products from the running backend.

**Not in this phase:** routing (Phase 6), generated API types (Phase 7), styling (Phase 9).

## E2E additions (`e2e/`)
None yet (Playwright arrives in Phase 3). Check by hand: the product list renders.

## Your manual steps (user)
Start the backend (`docker compose up --build --wait` in the backend repo). Review, merge,
and reply `merged, continue`.
```
