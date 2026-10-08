# Test Report: Phase 22 (Security)

- **Date:** 2026-10-08
- **Branch:** `feature/phase-22-security`
- **Run by:** Claude Code, on the owner's machine (Windows 11 + WSL2 Ubuntu), Node v24.21.0
- **New dependencies:** none. `package.json` `overrides`: `tmp` 0.2.7, `basic-ftp` 6.2.2 (patched transitive packages of the Phase 21 tooling).
- **Backend:** pinned `phase-34-complete`, started from the read-only clone with `CUSTOMER_DB_PORT=15435`. Its seed stock was used up by this phase's own full runs (Desk Mat and Laptop Sleeve at 0): see section 2.
- **Merge verification of Phase 21** (before branching): PR #26 merged as `97d9892`, tag `phase-21-complete`; the branch tip `e7f213a` is an ancestor of `main`; CI on `main` green.
- **Backend sync** (before branching): the clone's `origin/main` is 57 commits past the pin (outbox and notification fixes, a management-port 404, paged `GET /products` = web KI-025); nothing needed for this phase. Pin unchanged.

## 1. Gates run locally

| Command | Result |
|---|---|
| `npm ci && npm run verify` (typecheck, lint, format, tokens, tests, build, budgets, **dist check**) | exit 0; 67 test files, **853 tests** (was 834; +19: 12 for `check-dist`, 7 for `audit-deps`) |
| `npm run audit:deps` | exit 0: 6 high packages reported, 2 advisories accepted (extract-zip, expires 2026-12-31) |
| `npm audit --omit=dev` | 0 vulnerabilities (the shipped dependencies) |
| Trivy 0.75.0 on the image, HIGH/CRITICAL with a fix | **before** the Dockerfile change: 1 finding (pcre2 CVE-2026-103111), exit 1. **After** `apk upgrade pcre2`: 0, exit 0 |

## 2. E2E against the container (`npm run e2e:docker`, CSP in force)

- **984 passed, 3 failed, 0 CSP violations.** The new `cspGuard` fixture fails any test on a `securitypolicyviolation`; the new headers spec checks five paths.
- The first run with the policy found two real problems, both fixed: 567 `eval` violations (zod's `Function('')` probe, fixed with `jitless`) and the test-only inline `<style>` of `zoom.spec.ts` (`bypassCSP` for that spec, with the reason in a comment). A second run found `nosniff, nosniff` on proxied API answers (the gateway sets it too; fixed with `proxy_hide_header`).
- The 3 failures are `checkout.spec.ts` (2) and `keyboard-flows.spec.ts` (1): the product card has no "Add to cart" because the shared backend's stock for Desk Mat and Laptop Sleeve is 0 after two full runs (web KI-020's weakness: the specs assume seed stock). No admin credentials here to restock, and `down -v` would also touch the backend team's volumes. CI starts a fresh backend, so its run is the real check.
- `npm run e2e` (preview server) was not rerun locally: it sends no policy, so it cannot show CSP behaviour; CI runs it.

## 3. CI

See the PR. The proof that CI blocks a vulnerable dependency and a vulnerable image is recorded in the PR description.
