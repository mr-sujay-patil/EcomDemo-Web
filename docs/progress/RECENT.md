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

## Phase 09: Design System (tag: phase-09-complete, PR #12)
**What exists now:** The approved look is code. Paper-coloured pages, self-hosted fonts, light and dark (follows the system until the header's **Theme** button is used; the choice is kept in `localStorage`), seventeen components, every existing page restyled, `/styleguide` (dev and E2E preview only), and a token check in `verify`. Product photos come from the API's `imageUrl` (backend `phase-34-complete`), with a "Photo to come" well for `null` or a failed load. The shelf filters with category `Chip`s; its h1 is "Everything for the desk".
**Key code:** `src/styles/tokens.css` (tokens, `--fs-*`/`--lh-*` type scale), `src/styles/base.css`, `src/components/<Name>/` (Icon, Logo, Button + `buttonClass`, StatusBadge, Chip, TextField, QuantityStepper, Price, ProductTile, ProductCard, CartLine, OrderSummary, SagaTimeline, AssistantMessage, StaffNote, Alert, Header), `src/app/{useTheme,ThemeToggle,Layout}`, `scripts/check-tokens.mjs`, `docs/architecture/design-system.md`.
**Config & infrastructure:** `npm run check:tokens` (in `verify`); `VITE_STYLEGUIDE=true` adds `/styleguide` to a build (Playwright sets it); coverage floor 99.39 / 95.77 / 100 / 100; `eslint` `jsx-a11y/aria-role` ignores non-DOM; E2E stubs product images unless `realImages: true` (gateway rate limit 50 req/s).
**Tests:** 362 unit and component (was 188; includes `scripts/`), 247 E2E (was 229).
**Backend tested against:** `phase-34-complete` (the backend team's running stack, two docs-only commits past it).
**Gotchas:** Style new UI with tokens only: `npm run check:tokens` fails on hex, `rgb(`, a px font size, a gradient, an emoji, or an import of Tailwind/Radix/shadcn/Lucide/Heroicons. A router link that must look like a button uses `buttonClass()`. A component takes server numbers (`lineTotal`, `total`); never add prices. `ProductCard` has no button unless `onAdd` is passed. Tab order now has ~10 stops before the first card (header, chips, sort). A new screen goes in `e2e/screens.ts` (the matrix covers it); keep E2E requests per page low (429).
**Owner TODOs open:** `src/content/site.ts`; every paragraph of About, Returns, Shipping, Privacy, Terms; no `StaffNote` is rendered on the shelf or product page until the owner writes one (design `patterns.md`).
**Backend asks:** images (web KI-002) delivered in `phase-34-complete` and used here. Nothing open.
**Follow-ups (not done, out of scope):** the About page photo and real store photography; per-product tab titles; an `<h1>`-aware search page (Phase 15); Add to cart (Phases 11 and 12).
