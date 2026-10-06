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
| — | none yet | | | | |

## Backend gaps this app adapts to

| ID | Gap | Backend issue | Triage | How this app adapts | Status |
|---|---|---|---|---|---|
| KI-001 | The gateway answered every CORS preflight with 401, so cross-origin browser calls with a token failed | backend KI-041, fixed in backend PR #53 and tagged `ki-041-fixed`; the pin `phase-33-complete` includes it | Backend | Always same-origin: Vite proxy in dev and preview, nginx in the image, one ingress host in Kubernetes. The same-origin proxy is optional now and is kept (see `docs/decisions.md`). Re-check cross-origin calls in the phase that builds the API client | Open (fixed in the backend; not yet re-checked from the web) |
| KI-002 | No product image field in `ProductResponse` | backend PR #59, tagged `phase-34-complete` (the backend's answer to this request) | Backend | Fixed in the backend and pinned (chore `chore/pin-backend-phase-34`): `imageUrl` is a gateway-relative path or `null`. Products without an image show "Photo to come"; never stock or generated images | Fixed (Phase 9 uses `imageUrl`) |
| KI-003 | `GET /api/products` returns the whole catalogue, unpaginated and unsorted | backend KI-007 | Backend | Filter, sort and paginate client-side (Phase 8); acceptable until a few hundred products | Open |
| KI-004 | No category list endpoint; `category` is free text and may be `null` | backend: not tracked | Backend | Derive the filter list from the loaded products; group `null` as "Other" (Phase 8) | Open |
| KI-005 | No refresh token and no server logout | backend KI-017 | Backend | Warn before `expiresAt`, re-login every 15 minutes, logout = drop the token (Phase 11) | Open |
| KI-006 | No password-change endpoint | backend KI-018 | Backend | No "change password" screen (Phase 14 says so on the profile page) | Open |
| KI-007 | A cancelled order does not restore the cart | backend KI-019 | Backend | "Add these items to my cart again" from the order's `items` (Phase 13) | Open |
| KI-008 | No shipping address, delivery, or customer order cancellation | backend: not tracked | Backend | One-click checkout with no address step; no cancel button (Phase 13) | Open |
| KI-009 | No currency field; one implicit currency | backend: not tracked | Accepted | The UI shows ₹ with `en-IN` formatting (`docs/decisions.md`) | Open |
| KI-010 | No push for order status | backend KI-022 | Backend | Poll `GET /api/orders/{id}/status` every 1-2 s (Phase 13) | Open |
| KI-011 | The assistant and inventory OpenAPI documents carry no security markers, so generated clients can't tell which calls need a token | backend: not tracked (cosmetic) | Backend | The API client attaches the token to every call when signed in (`src/api/client.ts`); access rules come from the guide's tables (`src/api/access.ts`, checked against the snapshots) | Open (adapted in Phase 7) |
| KI-015 | The backend publishes one GHCR image (`ghcr.io/mr-sujay-patil/ecomdemo`, the default `MODULE=ecomdemo-app`, only on merges to `main`), not the eight per-service images its compose stack runs, and none for release tags (`ki-001-fixed` has no image) | backend: not tracked (asked through the user, Phase 5) | Backend | The CI e2e job builds the stack from source at `BACKEND_TAG` (`.github/workflows/ci.yml`), which is slower. Switch that step to `docker compose pull` when per-service images tagged by release exist | Open |
| KI-016 | The backend's OpenAPI documents mark no response property as required (only request bodies have `required`), so a generated type makes every field optional (`price?: number`) | backend: not tracked (cosmetic; springdoc `@Schema(requiredMode = REQUIRED)`) | Backend | `scripts/openapi.ts` generates the types from a copy of each snapshot in which every response schema lists all its properties as required (Jackson includes nulls, nothing sets NON_NULL); `e2e/api-contract.spec.ts` checks the live products carry every property. Revisit if the backend marks them | Open |

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
