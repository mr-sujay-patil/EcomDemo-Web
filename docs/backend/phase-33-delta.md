# Backend delta: `ki-001-fixed` to `phase-33-complete`

Source: the backend team's update document "EcomDemo Backend Update for the Frontend" (2026-09-30), checked against the backend code at `phase-33-complete`. The integration guide (`integration-guide.md`) has **not** been rewritten for Phase 33; read this file with it. The checks marked "(code)" were confirmed in the read-only clone; the rest is the document's word until a test proves it.

## What changed and what it asks of this app

| Change | Backend version | Action here |
|---|---|---|
| `POST /api/auth/login` answers `429` + `Retry-After` (seconds) + the usual `ApiError` body after repeated failures (code: `AuthController`, `LoginThrottledException`) | Phase 33 | **Code** in the phase that builds the sign-in form (see below) |
| The gateway answers CORS preflights before authentication; allowed origins come from `CORS_ALLOWED_ORIGINS` (default `http://localhost:3000`) | `ki-041-fixed` | None: the same-origin proxy stays (`docs/decisions.md`) |
| Tokens are signed RS256 with a `kid` header; claims (`sub`, `uid`, `roles`, `exp`), the 15-minute life, the login response and the lack of a refresh token are unchanged | Phase 33 | None: the token stays an opaque Bearer string; never verify it in the browser |
| Services call each other with scoped tokens; `GET /oauth2/jwks` and `POST /oauth2/token` are internal, not routed by the gateway | Phase 33 | None |
| Running the stack needs `JWT_SIGNING_KEY` and `GATEWAY_`, `APP_`, `CATALOG_CLIENT_SECRET` in the backend `.env` (code: `.env.example`) | Phase 33 | Done in this chore (CI) and by the user in their clone |
| The customer OpenAPI document lists the `429` on login | Phase 33 | Types are generated in Phase 7 from `/v3/api-docs/customer` |

## Login throttling (for the sign-in phase, Phase 11)

- Limits within 15 minutes: 5 failed logins per username (case-insensitive), 20 per client address. The first block lasts 30 s and doubles with each further failure, up to 15 minutes. The attempt that reaches the limit is still a `401`; the next one is `429`. A blocked attempt is refused even with the right password. A correct password clears the username's count. Registration is not throttled.
- On `429` from login: read `Retry-After`, disable submit, show a countdown ("Try again in 28 s"); never retry automatically. Keep the wording of the other `401`s unchanged (wrong password and unknown username look the same on purpose).
- A `429` **without** `Retry-After` is the gateway's general rate limit (50 requests/s per client): back off for a second.
- Tests: a component test for the throttled state (mock `429` + `Retry-After: 30`); an E2E test that the sixth wrong password in a row for one username shows the wait. Use distinct usernames for wrong-password cases.
- **One machine is one client**: every browser and E2E run on this machine shares one counter of 20 failed logins per 15 minutes, across all usernames, and even a correct login gets `429` while blocked. Keep wrong-password tests few. If blocked, wait for `Retry-After` or ask the user to restart the backend stack with fresh volumes (`docker compose down -v`; this app cannot clear it).
- Local development without a signing key: restarting customer-service invalidates every token; expect `401` and send the user to sign in.

## Checklist

- [x] Pin and read-only clone moved to `phase-33-complete`; CI `.env` generation updated (chore `chore/pin-backend-phase-33`)
- [ ] Phase 7: regenerate the types from `/v3/api-docs/customer` and confirm login documents `429`
- [ ] Phase 11: the throttled login state, the API client's `429`-without-`Retry-After` rule, and the two tests above
- [ ] Fold this into the integration guide's authentication and error sections when that guide is next updated
