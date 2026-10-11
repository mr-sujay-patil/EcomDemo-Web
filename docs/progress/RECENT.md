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

## Phase 25: Code Quality Dashboard (tag: phase-25-complete, PR #45)
**What exists now:** An optional, self-hosted SonarQube Community Build (`compose.sonar.yaml`, project `ecomdemo-web-sonar`, **127.0.0.1:9010**, containers `ecomdemo-web-sonarqube` / `ecomdemo-web-sonar-db`) analyses `src/` with the pinned scanner image (`npm run sonar`) and judges it with the gate `EcomDemo Web way`: the backend's six conditions, all on new code, coverage 80. No account, no CI job, no secret in the repository (web KI-014).
**Key code:** `compose.sonar.yaml`; `scripts/sonar-setup.sh` (wait for UP, admin password from `SONAR_ADMIN_PASSWORD` replacing the factory one, project `ecomdemo-web`, gate as code with drift correction, attach, project analysis token printed once; `--no-token`); `scripts/sonar-scan.sh` (scanner `12.2.0.4256_8.1.0` on the stack network as `http://sonarqube:9000`, repo mounted read-only, cache volume `ecomdemo-web-sonar_scanner-home`); `sonar-project.properties`; `vite.config.ts` adds the `lcov` reporter. Decisions [Phase 25].
**Config & infrastructure:** env `SONAR_ADMIN_PASSWORD`, `SONAR_TOKEN` (user's shell only), optional `SONAR_PORT`, `SONAR_URL`, `SONAR_HOST_URL`, `SONAR_NETWORK`, `SONAR_DB_PASSWORD`. Python 3 and curl for the setup script. SonarQube needs ~2 GB, and Elasticsearch 10-15 % free disk.
**Tests:** 996 unit (was 981): `scripts/sonar.test.ts` (15). Real run: gate OK, coverage 99.2 %, 0 bugs / vulnerabilities / hotspots, 144 code smells; a throwaway project showed the gate failing on 2 new issues (exit 3).
**Backend tested against:** none needed (no app code or API change); pin `669a9ed` unchanged.
**Gotchas:** the first analysis has no new code, so the gate passes with no condition evaluated. Coverage and duplication conditions are skipped for changes under 20 new lines. The server runs in MQR mode: the two rating conditions are "Standard Experience" metrics (kept to match the backend). This container's disk shows 8 % free, so its real run needed an uncommitted tmpfs for the search index. The scanner runs as uid 1000 and must be able to read the checkout.
**Owner TODOs open:** unchanged from Phase 14; the Phase 18 screen-reader pass.
**Backend asks:** none new.
**Follow-ups (not done):** triage KI-038 (144 findings); switch both repositories' gates to the MQR rating metrics together; analyse `e2e/` and `scripts/` too; SonarQube for IDE; a CI analysis only if the owner wants one later.

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
