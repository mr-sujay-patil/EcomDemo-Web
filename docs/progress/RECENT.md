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

## Phase 04: Code Quality (tag: phase-04-complete, PR #4)
**What exists now:** The app is unchanged (same bundle hash); `npm run verify` now also runs ESLint and a Prettier check, so style and a set of bug-prone patterns are enforced by machines.
**Key code:** `eslint.config.js` (flat, `defineConfig`: `recommendedTypeChecked` + `projectService`; hooks + jsx-a11y on `src/`; Playwright `flat/recommended` on `e2e/` with `expect-expect` counting `ready`; `no-console` off in tests/`e2e/`; `disableTypeChecked` for `**/*.js`; `eslint-config-prettier` last). `.prettierrc.json` (120 cols, no semicolons, single quotes), `.prettierignore` (`*.md`, `design-system/`, generated dirs), `.editorconfig`.
**Config & infrastructure:** **TypeScript 6.0.3** (was 7.0.2: 7 has no JS compiler API for typescript-eslint). **ESLint 9.39.5** (jsx-a11y 6.10.2 declares ≤9), typescript-eslint 8.71.0, react-hooks 7.1.1, jsx-a11y 6.10.2, playwright plugin 2.12.0, prettier 3.9.9, eslint-config-prettier 10.1.8, globals 17.12.0. Scripts `lint` (`--max-warnings=0`), `format`, `format:check`; `verify` = typecheck && lint && format:check && test && build. No pre-commit hook.
**Tests:** unchanged: 6 component, 22 E2E. Probes (deleted) proved each named rule fires and that an unformatted file fails `verify`.
**Backend tested against:** `ki-001-fixed`
**Gotchas:** A new file outside every tsconfig gets "was not found by the project service": add it to a tsconfig's `include` (or it's a `.js` config, which skips type-aware rules). A helper that wraps `expect` must be named `ready` or added to `expect-expect`'s `assertFunctionNames`. Run `npm run format` before committing. `design-system/` is ignored by both tools until Phase 9. The backend's product count changes when someone restarts it (14 this run).
**Owner TODOs open:** none
**Backend asks:** none
**Follow-ups (not done, out of scope):** back to TypeScript 7 when typescript-eslint supports it; ESLint 10 when jsx-a11y does; consider `strictTypeChecked`; run `verify` in CI (Phase 5); lint/format `design-system/` or not (Phase 9).

## Phase 03: End-to-End Smoke Tests (tag: phase-03-complete, PR #3)
**What exists now:** The app is unchanged; `npm run e2e` builds and previews it, then drives it in Chromium against the real backend: the catalogue, the gateway-unreachable error state, and every screen at 360/480/768/1024/1280 px in light and dark.
**Key code:** `playwright.config.ts`; `e2e/global-setup.ts` (gateway check, prints the backend tag from `BACKEND_TAG` or the clone); `e2e/fixtures.ts` (**import `test`/`expect` from here**: console guard, `allowedConsoleErrors` option); `e2e/screens.ts` (**add every new screen/state here**: `name`, `path`, `prepare`, `ready`, `allowedConsoleErrors`; also `gatewayUnreachable`, `abortedRequestError`); `e2e/catalog.spec.ts`; `e2e/layout.spec.ts`; `e2e/report.spec.ts` (`@report`).
**Config & infrastructure:** @playwright/test 1.63.0 (Chromium build 1243). Projects `chromium` (smoke, excludes `@report`) and `report`. Scripts: `e2e` (`--project=chromium`), `e2e:ui`, `e2e:report` (screenshots → `docs/test-reports/phase-XX/`, phase from the branch or `REPORT_PHASE`). `tsconfig.e2e.json` joins `tsc -b`. `webServer` never reuses a running 4173. Retries 0 locally, 2 on CI (traces on first retry).
**Tests:** 22 E2E (2 catalogue + 20 layout matrix) + 8 report screenshots; 6 component tests unchanged.
**Backend tested against:** `ki-001-fixed`
**Gotchas:** Aborting a request makes Chrome log "Failed to load resource: net::ERR_FAILED": declare it in `allowedConsoleErrors`. React dev warnings never show in the preview build, so keep the dev-server console check. The catalogue has 22 rows but only ids 1–10 are seeded: assert names, never counts. "Dark" screenshots equal light until Phase 9 adds `color-scheme`. `pkill -f <pattern>` inside `bash -c` also matches its own shell.
**Owner TODOs open:** none
**Backend asks:** none
**Follow-ups (not done, out of scope):** run `e2e` in CI with the backend (Phase 5); the "Try again" button on the error state (carried; the E2E suite should then click it); `npx playwright install --with-deps` for CI runners (Phase 5).
