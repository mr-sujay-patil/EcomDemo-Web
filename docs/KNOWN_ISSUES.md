# 🐞 Known Issues

The one list of known defects, gaps, and deferred work in **EcomDemo Web**, mirroring the backend's register. Numbers restart at KI-001 in each repository, so a cross-reference always names the repository: "web KI-003", "backend KI-041".

**The rule:** a defect (something that used to work, or should work, and doesn't) is fixed on a `fix/ki-XXX-<slug>` branch. A new capability or technology is a phase. The lifecycle is in `docs/process/execution-protocol.md` (section 8). A **backend** defect or gap is never fixed or worked around silently here: it gets a row below pointing at the backend issue, and the user takes it to the backend.

## Triage values

| Triage | Meaning |
|---|---|
| **Fix** | A defect in this app. Goes through the fix track, one branch and one PR per issue |
| **Phase N** | Covered by an approved phase. Closed by that phase's PR |
| **Candidate** | A new capability. Becomes a phase only if the user approves one |
| **Accepted** | A deliberate limit, with the reason written down. No work planned |
| **Needs check** | Recorded as a gap at the time. Not re-verified against the current code; check before triaging |
| **Backend** | Owned by the backend; this app adapts as described. Re-checked whenever the pinned backend tag moves |

**Status:** Open · In progress (branch) · Fixed (PR #, tag `ki-XXX-fixed`) · Won't fix (reason)

**Severity:** High (security hole, data loss, or wrong business outcome) · Medium (broken or missing behaviour with a workaround, or a real risk under a plausible condition) · Low (cleanup, docs, cosmetics)

Adding an issue: take the next free ID, add a row, and add a detail section only when the row can't carry the scope. Found during a phase or fix? Record it here in that branch; don't fix it in passing.

## Fix: the defect queue (in suggested order)

| ID | Issue | Severity | Since | Source | Status |
|---|---|---|---|---|---|
| KI-017 | Every browser write (POST, PUT, DELETE) through the dev and preview proxy got `403` from the gateway: `changeOrigin: true` rewrote `Host` to `localhost:8080` while the browser's `Origin` stayed `http://localhost:5173` or `:4173`, so the gateway's CORS check saw a cross-origin write. Reads were fine (a GET carries no `Origin`), so nothing showed it until registration | High (blocked Phase 10's goal) | Phase 7 (the proxy), found in Phase 10 | `curl` with `Host` equal to `Origin`: 400 from the validator; with `Host: localhost:8080`: 403. Browser run of the register form: `POST /api/customers/register` 403 | Fixed in Phase 10: the proxy keeps `Host` (`vite.config.ts`). **Carry forward:** the nginx in the image (Phase 21) and the ingress (Phase 22) must also keep `Host` (`proxy_set_header Host $host`), or the backend's `CORS_ALLOWED_ORIGINS` must name the origin |
| KI-018 | A focused text field showed two rings: its box's `:focus-within` ring and an outline on the input inside it (the shared focus rule in `base.css` loaded after `outline: 0`). With an error showing the ring was green on a red border | Low | Phase 9 | Screenshot of `/register` with errors at 360 px | Fixed in Phase 10 (the field's box shows focus; red in error), mirrored in `design-system/components.css` |
| KI-020 | `e2e/checkout.spec.ts` "a quantity above stock is refused up front" needs the seeded Laptop Sleeve 16" to have stock 2. On the shared backend it is 0 (found 2026-10-08, Phase 14), so the shelf has no "Add to cart" for it and the spec times out. The app is right; the test depends on seed data it cannot restore (the API has no way to return stock without an ADMIN, and the stack is the backend team's). Fix: make the spec read the stock and pick any product with 1 to 3 in stock, or set one up as an admin. **Found again 2026-10-08 (Phase 15 merge verification):** on a stack started fresh from the clone the spec passed (stock 2); on the next run the same stack's Laptop Sleeve was 0, so the suite itself seems to drain the seed stock when it runs on a persistent database (not confirmed which spec takes it) | Low | Phase 13 | Phase 14 full E2E run | Open |
| KI-023 | Found by Phase 18's axe and reflow checks, four defects: (1) at a phone width the header's "Sign in" link had only an icon and no accessible name (`link-name`, serious), and the "Admin" link, which has no icon, lost its text and became an empty link; (2) each search suggestion held a focusable `<a>` inside `role="option"` (`nested-interactive`, serious); (3) at 320 px (400% zoom) the header's tool row, the import page's file input and the style guide's header specimens scrolled the page sideways; (4) the open account menu stayed open when keyboard focus moved on, and at a phone width it covered the search box that took focus (WCAG 2.4.11, found by the keyboard sweep) | Serious | Phase 7 (header), Phase 15 (search), Phase 17 (import) | `e2e/a11y.spec.ts`, `e2e/zoom.spec.ts`, run on 2026-10-08 | Fixed in Phase 18 (the phase's own done-when needs them gone): the sign-in link names itself with `aria-label` and only links that have an icon lose their text; an option is a plain row that opens the product; the tool row wraps; the file input has `min-width: 0`; the account menu closes when focus lands outside it |

## Backend gaps this app adapts to

| ID | Gap | Backend issue | Triage | How this app adapts | Status |
|---|---|---|---|---|---|
| KI-001 | The gateway answered every CORS preflight with 401, so cross-origin browser calls with a token failed | backend KI-041, fixed in backend PR #53 and tagged `ki-041-fixed`; the pin `phase-33-complete` includes it | Backend | Always same-origin: Vite proxy in dev and preview, nginx in the image, one ingress host in Kubernetes. The same-origin proxy is optional now and is kept (see `docs/decisions.md`). Re-check cross-origin calls in the phase that builds the API client | Open (fixed in the backend; not yet re-checked from the web) |
| KI-002 | No product image field in `ProductResponse` | backend PR #59, tagged `phase-34-complete` (the backend's answer to this request) | Backend | Fixed in the backend and pinned (chore `chore/pin-backend-phase-34`): `imageUrl` is a gateway-relative path or `null`. Products without an image show "Photo to come"; never stock or generated images | Fixed (Phase 9 uses `imageUrl`) |
| KI-003 | `GET /api/products` returns the whole catalogue, unpaginated and unsorted | backend KI-007 | Backend | Filter, sort and paginate client-side (Phase 8); acceptable until a few hundred products | Open |
| KI-004 | No category list endpoint; `category` is free text and may be `null` | backend: not tracked | Backend | Derive the filter list from the loaded products; group `null` as "Other" (Phase 8) | Open |
| KI-005 | No refresh token and no server logout | backend KI-017 | Backend | Adapted in Phase 11: a notice a minute before `expiresAt`, the session ends at it (back to `/sign-in?next=…`, drafts kept), sign-out drops the token and the person's cached data | Open (adapted; needs backend KI-017 to improve) |
| KI-006 | No password-change endpoint | backend KI-018 | Backend | No "change password" screen (Phase 14 says so on the profile page) | Open |
| KI-007 | A cancelled order does not restore the cart | backend KI-019 | Backend | "Add these items to my cart again" from the order's `items` (Phase 13) | Open |
| KI-008 | No shipping address, delivery, or customer order cancellation | backend: not tracked | Backend | One-click checkout with no address step; no cancel button (Phase 13) | Open |
| KI-009 | No currency field; one implicit currency | backend: not tracked | Accepted | The UI shows ₹ with `en-IN` formatting (`docs/decisions.md`) | Open |
| KI-010 | No push for order status | backend KI-022 | Backend | Poll `GET /api/orders/{id}/status` every 1-2 s (Phase 13) | Open |
| KI-011 | The assistant and inventory OpenAPI documents carry no security markers, so generated clients can't tell which calls need a token | backend: not tracked (cosmetic) | Backend | The API client attaches the token to every call when signed in (`src/api/client.ts`); access rules come from the guide's tables (`src/api/access.ts`, checked against the snapshots) | Open (adapted in Phase 7) |
| KI-015 | The backend publishes one GHCR image (`ghcr.io/mr-sujay-patil/ecomdemo`, the default `MODULE=ecomdemo-app`, only on merges to `main`), not the eight per-service images its compose stack runs, and none for release tags (`ki-001-fixed` has no image) | backend: not tracked (asked through the user, Phase 5) | Backend | The CI e2e job builds the stack from source at `BACKEND_TAG` (`.github/workflows/ci.yml`), which is slower. Switch that step to `docker compose pull` when per-service images tagged by release exist | Open |
| KI-016 | The backend's OpenAPI documents mark no response property as required (only request bodies have `required`), so a generated type makes every field optional (`price?: number`) | backend: not tracked (cosmetic; springdoc `@Schema(requiredMode = REQUIRED)`) | Backend | `scripts/openapi.ts` generates the types from a copy of each snapshot in which every response schema lists all its properties as required (Jackson includes nulls, nothing sets NON_NULL); `e2e/api-contract.spec.ts` checks the live products carry every property. Revisit if the backend marks them | Open |
| KI-019 | The app OpenAPI document says `CartItemResponse.unitPrice` is "the catalogue price right now, not a snapshot. It is fixed only at checkout". The backend since its Phase 20a does the opposite (`CartService.addItem` snapshots name and price into the line; `docs/decisions.md` [Phase 20a]), and the integration guide agrees with the code | backend: not tracked (stale `@Schema` text; to report to the user) | Backend | Follow the guide and the code: the cart line shows the cart's `unitPrice` labelled "price when added" (Phase 12). A web test pins that the label is the cart's price, not the product's | Open |
| KI-021 | The assistant OpenAPI document types `AssistantReply.pendingAction` as always present, but the backend sends `null` when there is nothing to confirm (the integration guide says so) | backend: not tracked (OpenAPI `@Schema` leaves the field nullable out; to report to the user) | Backend | `src/features/assistant/assistant.ts` widens the generated type to `PendingCartAddition \| null` in one place and a test sends the `null` reply (Phase 16) | Open |
| KI-022 | `POST /api/products/{id}/generate-description` saves the generated description to the product at once (backend decision [Phase 27], `GeneratedDescriptionResponse`: "already saved"). The guide and the Phase 17 file call it a draft that is not saved | backend: not tracked (guide section 7 to correct, or a draft mode to add; to report to the user) | Backend | The admin screen asks first ("this replaces the description now"), keeps the old text in memory and offers "Restore previous" with a normal `PUT` (Phase 17, owner chose this on 2026-10-08) | Open |
| KI-024 | Backend `main` (not the pin) pages the catalogue, backend KI-007: `GET /api/products` returns 50 products by default (100 at most) as an array, with `X-Total-Count` and an RFC 8288 `Link` header, `?page=` from 0 and `?size=`. The shelf, the admin Products and Stock screens and the inventory ids all assume the whole catalogue comes back, so after a pin move they would silently show only the first 50 | backend KI-007 (fixed on backend `main`, PR #70, found 2026-10-08, Phase 19 sync) | Backend (future pin) | None yet: the pin is `phase-34-complete`, which returns everything, and the seeded catalogue is well under 50. Whoever moves the pin (`chore/pin-backend-<tag>`) must first make the list calls follow `Link: rel=next` (or ask `size=100` and check `X-Total-Count`), and `npm run api:check` will show the new `page` and `size` parameters | Open (starts with the pin move) |
| KI-025 | The backend's kind cluster (`ecomdemo`, the backend team's, up for 9 days) is **ahead of the pin and its data is used up**: its gateway pages the catalogue (backend KI-007: 50 of 145 products, `Link` and `X-Total-Count`) and serves the new dead-letter shape (`dltTimestamp`, backend KI-040), and the seeded stock is drained (Mechanical Keyboard, Wireless Mouse, USB-C Hub and Laptop Sleeve at 0, Desk Mat 58). Through `shop.localhost:18080` **6 data-dependent specs fail** (`catalog` seeded products, `design` images, `checkout` x2, `orders` x2); the same 6 fail the same way through the plain preview server against that backend, so they do not come from Kubernetes. The catalog and images specs assume the ten seeded products are on the shelf's first page of 24 sorted A to Z (with 50 products loaded, Wireless Mouse is on page 3); the other four need in-stock seeds (the general form of KI-020) | backend: not tracked (a cluster started from the pinned tag, or reseeded, is needed to run Phase 20's suite clean; to ask the user) | Backend / Test data | None in the app. Phase 20's own checks (pod deletion, rolling update, Ingress, the other 980 specs) pass. To close: the backend team reseeds, or starts the cluster from `phase-34-complete`, or the owner approves a fix of the specs (find products that are in stock; find seeds through search) | Open |
| KI-026 | In `npm run e2e:k8s` the keyboard sweep of the `register-errors` screen (light and dark) failed in 2 of 3 full runs (Phase 20 merge verification) when the background job deleted one app pod: Tab missed the header's Sign in and Cart links. With no pod deleted only KI-025's six fail; the spec passes every time alone and in CI. Reproduced by deleting both pods during repeated runs of that spec (8 of 60 failed). Cause not confirmed: a page load in flight while a pod terminates (a reused connection) is the likely one, and the zero-failed-request traffic specs never saw it | Low | Phase 18 (the sweep), Phase 20 (the deletion) | Phase 20 merge verification, 2026-10-08 | None yet. Candidates: a longer `preStop` pause, nginx `keepalive_timeout` or a lame-duck period, or a retry in the sweep. Not fixed in passing | Open |
| KI-027 | LCP misses the 2.5 s budget in CI (Phase 21): the shelf is 2.40 s on a fast desktop but **2.89 s then 2.46 s in two CI runs of the same build** (painted after React starts, so it scales with the CPU, and the runner's own spread is about 0.4 s), and a product page loaded cold is 2.57 s here and 2.59 s on CI: the photo is the end of a chain (page, script, data, photo) on a slow link. A visitor who opens a product from the shelf does not pay it (the data is prefetched on hover and focus). CI reports LCP as a warning on both pages | Medium | Phase 21 | `npm run perf` and the first CI run, 2026-10-08 | Owner's choice: calibrate the CPU slowdown for the runner, relax the numbers, and for the product page fetch its data from a small inline script in `index.html` (copies the route and API shape into the HTML). Details in `docs/performance.md` | Open |
| KI-028 | `e2e/visual.spec.ts` "shelf at 1280 px, light" failed on the first attempt in one CI run (Phase 21 PR) and passed on retry: the diff is only the text of the native sort `<select>` ("Name (A to Z)"), which the browser rasterised slightly differently. The baseline is Phase 18's; one occurrence in the CI runs of Phases 19 to 21 | Low | Phase 18 | CI run 37783408105 | None yet. Candidates: mask the select in that screenshot (hides a real change to it), or give it a fixed rendering. Not changed in passing | Open |

## Covered by an approved phase

| ID | Item | Phase |
|---|---|---|
| — | none yet | |

## Candidates: new capabilities (a phase only if approved)

| ID | Capability | Notes |
|---|---|---|
| KI-012 | Guest cart kept in the browser and replayed with `POST /api/cart/items` after login | The guide suggests it; the backend has no guest cart |
| KI-013 | Server-sent events for order status instead of polling | Needs backend KI-022 first |
| KI-014 | Code-quality dashboard (SonarQube Cloud) as the backend has | Not in the guide's roadmap; propose as a phase if wanted |

## Accepted limits

| ID | Limit | Reason |
|---|---|---|
| — | none yet | |

## Needs check (not re-verified against the current code)

| ID | Item | Check |
|---|---|---|
| — | none yet | |
