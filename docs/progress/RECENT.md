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

## Phase 11: Authentication (tag: phase-11-complete, PR: see `gh pr list`)
**What exists now:** A signed-in customer stays signed in while they shop. The session (token, `expiresAt`, profile) lives in memory only: a reload signs out. `/cart`, `/checkout`, `/orders`, `/orders/:id`, `/account` need a CUSTOMER, `/admin/*` an ADMIN; signed out goes to `/sign-in?next=…` and comes back, the wrong role sees "Not permitted" in place. A notice appears a minute before expiry; at expiry or on any 401 (with a token) the session ends, the person's cached data goes, and unsent form text is kept. The header shows Sign in, or the first name with a menu (My orders, Account, Sign out) and an Admin link for ADMIN. A throttled login shows a countdown.
**Key code:** `src/features/auth/` (`session.ts`, `SessionProvider.tsx`, `useSession.ts`, `RequireRole.tsx`, `nextPath.ts`, `AccountMenu.tsx`, `ExpiryNotice.tsx`, `useFormDraft.ts`), `src/features/accounts/SignInPage.tsx` (+ `wait.ts`), `src/api/client.ts` (`setAccessTokenProvider`, `setTokenRejectedHandler`, both take `null`), `src/app/pageTitle.ts`, `docs/architecture/auth-flow.md`, `docs/modules/auth.md`.
**Config & infrastructure:** no new dependencies. `renderRoute(path, { signedInAs })` renders the app signed in; `e2e/screens.ts` has `visit(page, path, role)` (signs in with stubbed answers, no reload) and `stubAccount`. Coverage floor 99.83 / 96.78 / 100 / 100. `eslint` knows `openScreen` asserts.
**Tests:** 578 unit and component (was 450), 310 E2E (was 273).
**Backend tested against:** `phase-34-complete`, started from the clone for this phase (no stack was running); `api:check` matched.
**Gotchas:** A new protected route goes inside a `RequireRole` group. Any query for a person's data must not have a key starting with `'catalog'` (it is dropped when the session ends). Page 'Not permitted' names itself with `usePageTitle`. A page that must survive an expiry keeps its form in `useFormDraft(form, key, ['password'])`. A full page load drops the session: E2E opens guarded screens through `visit()`. `Date.now()` in render is flagged by lint: start timers in handlers (`useCountdown`). Failed logins are throttled per client address; the new specs fail none. Prettier can re-wrap a line and make a scripted `replace` silently not apply: verify edits.
**Owner TODOs open:** `src/content/site.ts`; every paragraph of About, Returns, Shipping, Privacy, Terms; no `StaffNote` on the shelf or product page until the owner writes one.
**Backend asks:** none (the backend team's stack ran an unreleased `dltTimestamp` field on an admin response before this phase; additive, not used here).
**Follow-ups (not done, out of scope):** load the account pages lazily (the main bundle is 515 kB); an E2E for a 401 mid-session once a page makes an authenticated call (Phase 12); the profile form (Phase 14, `profileSchema` is ready).

## Phase 10: Forms and Validation (tag: phase-10-complete, PR #13)
**What exists now:** `/register` and `/sign-in` work against the real backend. Register creates the account and goes to `/sign-in` with the username filled in and a note; sign-in checks the credentials and says "Signed in. Sessions arrive in the next phase." (the token is dropped: Phase 11). Every backend 400 lands on its own field; 409 on the username field; 401 reads "Wrong username or password."
**Key code:** `src/components/forms/` (`Form`, `Field`, `FormError`, `SubmitButton`, `applyServerErrors`), `src/features/accounts/` (`schemas.ts`: register, login, profile; `api.ts`; `RegisterPage`; `SignInPage`; `signInState.ts`), `TextField`'s `ref` and `trailing`, `supportReference` in `src/api/errors.ts`, `docs/architecture/forms.md`.
**Config & infrastructure:** `react-hook-form` 7.89.0, `zod` 4.6.5, `@hookform/resolvers` 5.9.1. **The dev and preview proxy keeps `Host`** (web KI-017: otherwise every browser write is a 403). Coverage floor 99.53 / 96.11 / 100 / 100.
**Tests:** 450 unit and component (was 362), 273 E2E (was 247).
**Backend tested against:** `phase-34-complete` (the backend team's running stack).
**Gotchas:** A new form: schema, `useForm` with `zodResolver` and `mode: 'onTouched'`, `Form` + `Field`s + `SubmitButton`, a `useMutation`, `applyServerErrors` then `FormError`. A 400 lists fields alphabetically; the mapper focuses the top-most in the form's order. Login failures are throttled per client address (20 per 15 min on this machine): the E2E suite fails one real sign-in per run; never loop wrong-password tests. E2E creates real accounts (`e2e-…`), about three per run; the API has no delete. The 429 countdown is Phase 11. The nginx image (Phase 21) and ingress (Phase 22) must keep `Host` when proxying `/api` (KI-017).
**Owner TODOs open:** `src/content/site.ts`; every paragraph of About, Returns, Shipping, Privacy, Terms; no `StaffNote` on the shelf or product page until the owner writes one.
**Backend asks:** none.
**Follow-ups (not done, out of scope):** load the account pages lazily (the main bundle grew ~121 kB); the throttled-login countdown and the session (Phase 11); the profile form (Phase 14, `profileSchema` is ready).
