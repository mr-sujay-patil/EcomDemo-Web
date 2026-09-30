# Phase 22: Security

| | |
|---|---|
| **Stage** | Stage 5: Quality |
| **Technology** | CSP + npm audit + Trivy |
| **Branch** | `feature/phase-22-security` |
| **PR title** | `Phase 22: Security` |
| **Requires** | `phase-21-complete` on `main` |
| **Needs from the backend** | none |
| **Completion tag** | `phase-22-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** Block vulnerable dependencies and images, and make the browser refuse anything the app did not ship.

**What you'll implement**
- nginx security headers: a strict **Content-Security-Policy** (`default-src 'self'`; `script-src 'self'` with no `unsafe-inline`; `style-src 'self'`; `img-src 'self' data:`; `connect-src 'self'`; `font-src 'self'`; `frame-ancestors 'none'`; `base-uri 'self'`; `form-action 'self'`), `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`. Fix what the CSP breaks (inline styles, the theme bootstrap script) rather than loosening it; each exception justified in `decisions.md`.
- CI: `npm audit --audit-level=high` and Trivy on the image (HIGH/CRITICAL with a fix available fail the build). Each finding fixed, or suppressed with a written justification and an expiry date.
- A CycloneDX SBOM for the image attached to the CI run.
- A check that `dist/` contains no secrets and no backend URL other than the relative `/api`.
- `docs/security.md`: the OWASP Top 10 as it applies to this app (XSS and the in-memory token, CSRF with bearer tokens, clickjacking, dependency risk, secrets in the bundle, the admin area), what protects each, and what is left.

**Concepts to understand**
- XSS and CSP as the second line of defence
- Why bearer tokens in memory aren't exposed to CSRF, and what XSS still reaches
- CVEs, CVSS, supply chain, SBOMs

**Done when**
- CI blocks a known-vulnerable dependency (shown with a pinned old package, then removed); the whole E2E suite runs with zero CSP violations (a Playwright listener on `securitypolicyviolation`); the security document is complete.

**Not in this phase:** new features.

## E2E additions (`e2e/`)

Every response carries the security headers; the whole suite runs with zero CSP violations.

## Your manual steps (user)

None. Only review, learn, merge, and reply `merged, continue`.
