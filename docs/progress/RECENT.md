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

## Phase 24: Guest Cart (tag: phase-24-complete, PR #44)
**What exists now:** A visitor fills a cart kept in the browser (`localStorage`, `ecomdemo-guest-cart-v1`, ids and quantities only, validated on read, followed across tabs) from the shelf, a product page and search; the header counts it; `/cart` shows it with current catalogue prices, no totals, and Sign in to check out. On a customer's sign-in it is replayed into the account's cart (GET the cart, one POST per line under a Web Lock, removed from storage line by line; 404 dropped, anything else kept with Try again; a send whose answer was lost is compared with the cart before it is ever resent, web KI-037) and a notice under the header reports it.
**Key code:** `src/features/cart/guestCart.ts`, `guestCartStore.ts`, `guestReplay.ts`, `GuestCartProvider.tsx` (in `AppProviders`, inside the session), `useGuestCart.ts`, `GuestCartPage.tsx`, `GuestCartNotice.tsx` (in `Layout`), `CartRoute.tsx` (`/cart` left `RequireRole`: guest, customer, admin, ended session); `useAddAction` signed out adds to the guest cart; `CartLine.lineTotal` optional. Decisions [Phase 24] (they replace [Phase 12]'s "a signed-out add goes to sign-in").
**Config & infrastructure:** none new. Shelf JavaScript 134.8 KB gzipped in 8 files (was 131.6 in 5; limit 170). `src/test/setup.ts` clears `localStorage` after each test; the MSW fake cart answers 404 for an unknown product.
**Tests:** 981 unit and component (was 904); E2E: `e2e/guest-cart.spec.ts` (2), `cart-guest` in the screen matrix, routes/cart/keyboard-flows specs changed to the new behaviour. E2E and perf ran only in CI (no backend in the container); the `cart-guest` matrix passed in a scratch run (18).
**Backend tested against:** none locally; CI at the pin `669a9ed`.
**Gotchas:** a test that leaves a replay running writes to the next test's storage (wait for it to finish). MSW: handlers in one `server.use` call answer in order, so pass overrides before the fake cart's. The replay's report is tied to the session's token.
**Owner TODOs open:** unchanged from Phase 14; the Phase 18 screen-reader pass (now also the signed-out add and the notice).
**Backend asks:** none new (KI-019, 020, 021, 022, 024, 025, 032 as before).
**Follow-ups (not done):** registration does not carry `?next=` (a new account lands on `/` after signing in; the replay still runs); a screenshot of the sign-in notice; an idempotency key for cart writes would make the KI-037 check unnecessary (backend).

## Phase 23: Observability (tag: phase-23-complete, PR #31)
**What exists now:** A render error shows a page with a reference instead of a blank screen: the route boundary keeps the header and footer, the root page stands alone, and one alert shows a reference for a promise nobody caught. Every `fetch` to `/api` carries a W3C `traceparent` (OpenTelemetry Web, no exporter) next to `X-Correlation-Id`. `docs/troubleshooting.md` follows a reference to Loki and Tempo with a worked example from a real failure (catalogue service stopped). **Half of the Done-when item is not possible at the pinned backend:** the gateway writes no request log, so the reference cannot find a gateway-answered failure in Loki (web KI-032, backend KI-035); the trace is found with the browser's trace id.
**Key code:** `src/app/ErrorPages.tsx`, `RootErrorBoundary.tsx`, `UnhandledRejectionNotice.tsx`, `errorReference.ts`, `tracing.ts`, `webVitals.ts`; `src/components/ErrorReference/` (shared by `ErrorPanel`); `router.tsx` (a pathless route with `errorElement` under the layout); `e2e/observability.spec.ts`, `scripts/e2e-service-down.sh` (`npm run e2e:service-down`: stops `ecomdemo-catalog-service`, always restarts it; the spec is skipped otherwise). Decisions [Phase 23].
**Config & infrastructure:** new pinned dependencies `@opentelemetry/*` and `web-vitals`. Shelf JavaScript 147.0 KB gzipped (was 130.5; limit 170). Chores after Phase 22: the backend pin is commit `f088fd4` (PR #28); CI caches the backend images from `backend-images.yml` on main and runs `verify` and `e2e` on pull requests only (PR #29); `CLAUDE.md` has the workflow rules (PR #30, in conflict with some hard rules: follow the hard rules).
**Tests:** 871 unit and component (was 855); container E2E (CSP on) 987 pass, 5 fail locally (stock 0, KI-020 x3; KI-026 sweep x2), CI green on a fresh backend.
**Backend tested against:** commit `f088fd4` (backend `main`, `ki-011-fixed`).
**Gotchas:** Loki gets logs only from the compose project `ecomdemo` (Alloy's regex); a clone in another folder name has an empty Loki (use a local override, never run it as `ecomdemo`). `traceparent` is only on `fetch`, not on `<img>`. An `E2E` pre-check accepts a 503 only when `E2E_SERVICE_DOWN` is set. The first `/assets/` link in `index.html` is the font preload, not a script.
**Owner TODOs open:** unchanged from Phase 14; the Phase 18 screen-reader pass is still open.
**Backend asks:** KI-032 (gateway request log or a correlation id on its span); still to relay: KI-019, 020, 021, 022, 024, 025.
**Follow-ups (not done):** web KI-030 (the shelf and admin list are not paged) and KI-031 (503 with `Retry-After`) from the backend's change note; show the trace id beside the reference; an OTLP dev exporter (needs a backend change); Part 1 rule conflicts and branch protection (owner).
