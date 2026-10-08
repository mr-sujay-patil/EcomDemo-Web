# Security

How **EcomDemo Web** is protected, mapped to the OWASP Top 10 (2021), and what is left. Written in Phase 22; the decisions behind each choice are in `docs/decisions.md` under `[Phase 22]`.

The app is one origin: the nginx in the web container serves the built files and forwards `/api` to the gateway, so the browser never makes a cross-origin call. Almost every protection below follows from that.

## The three ideas to hold on to

1. **XSS is the threat that matters most** for a single-page app, because script that runs in the page can do what the user can do. The first defence is not letting untrusted text become markup (React escapes it). The **Content-Security-Policy (CSP)** is the second line: even if something slipped through, the browser refuses to run script that did not come from our own origin.
2. **Bearer tokens in memory are not exposed to CSRF.** CSRF works because the browser attaches cookies to a request automatically. Our token is sent in the `Authorization` header by our own code, so a page on another site cannot make the browser send it. What it does *not* protect against is script running in our page (XSS), which can read the token from memory or call the API itself. That is why the CSP matters.
3. **Most of the risk is in code we did not write.** CVEs are published weaknesses in a package, scored by CVSS (0 to 10; we fail the build at High, 7.0 and up). The supply chain is everything between the author and our container; an SBOM is the list of what is in it, so a new CVE can be matched against it.

## The headers

Set by nginx (`nginx/security-headers.conf`, included in every location, so a 404 and a proxied API answer carry them too). The E2E suite against the container checks them on the page, a built file, a missing file, `/healthz` and `/api`.

| Header | Value | Why |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` | Only our own origin may supply code, styles, images, fonts, and receive requests. No `unsafe-inline`, no `unsafe-eval`. `frame-ancestors` stops clickjacking; `base-uri` stops an injected `<base>` redirecting relative URLs; `form-action` stops a form posting elsewhere |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | A link to another site sends our origin, never the path (an order number) |
| `X-Content-Type-Options` | `nosniff` | A file is used as the type it was sent as |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` | The shop uses none of these, so the page may not ask |
| `Cross-Origin-Opener-Policy` | `same-origin` | A window opened from another site gets no `window.opener` handle to ours |

**Making the app fit the policy** (rather than loosening it): the inline theme script became `public/theme-init.js`; zod no longer probes `Function('')` (`src/app/zodConfig.ts`); the app has no inline `style` attributes or `<style>` elements in the build. `Icon` uses `dangerouslySetInnerHTML`, but only with the static `ICONS` table in its own folder, never user input.

**Proof there are no violations:** `e2e/fixtures.ts` has an automatic `cspGuard` that listens for `securitypolicyviolation` in every test and fails on any. It only has something to catch when the suite runs against the container (`npm run e2e:docker`), because the dev preview server sends no policy. The one exception is `zoom.spec.ts` (`bypassCSP`), which injects a stylesheet the way a person's own settings would.

## OWASP Top 10, as it applies

| # | Risk | What protects against it | What is left |
|---|---|---|---|
| A01 | Broken access control | The **backend decides**. The web app hides admin screens from non-admins (`RequireRole` shows a "not permitted" page), but that is convenience, not security: every admin call is checked by the gateway and services against the token's role | A bug in the backend's checks is not visible here; the web E2E suite exercises the refusal paths it can |
| A02 | Cryptographic failures | No secrets in the bundle (`scripts/check-dist.mjs`); passwords go only to the backend; the token is never written to storage (`localStorage` holds only the theme choice) | This container speaks plain HTTP. TLS (and HSTS) must be terminated in front of it, by the ingress or load balancer. Not set up in this repo |
| A03 | Injection (including XSS) | React escapes text; the only raw-markup path is the static icon table; the CSP refuses inline and foreign script; no `eval` | A future `dangerouslySetInnerHTML` with user text would still need a review. Trusted Types (`require-trusted-types-for 'script'`) would make the browser enforce that; not adopted yet |
| A04 | Insecure design | Prices and totals come from the server and are never computed in JavaScript; the token lives in memory only (a reload signs the user out) | Business-rule abuse (coupon stacking, stock hoarding) is the backend's to prevent |
| A05 | Security misconfiguration | The headers above; `server_tokens off`; no source maps in `dist/` (checked); the container runs as a non-root user on a read-only root with all capabilities dropped (Phase 19/20); `/api` strips the gateway's duplicate headers | Defaults of the backend and the cluster are the backend team's |
| A06 | Vulnerable and outdated components | `npm run audit:deps` fails the build on a High or Critical advisory unless `audit-allowlist.json` accepts it with a reason and an expiry date; Trivy scans the image (High and Critical with a fix); exact versions and a committed lockfile; `overrides` for patched transitive packages | Two accepted `extract-zip` advisories (dev tooling only, no fix published; renew or fix by 2026-12-31). A new CVE published after the last CI run is found on the next run, not instantly |
| A07 | Identification and authentication failures | Handled by the backend (hashing, lockout, token lifetime). The web app keeps the token in memory, clears it on sign-out and on a 401, and never puts it in a URL | An XSS bug could still read the in-memory token; the CSP is the defence. There is no refresh-token flow in the contract |
| A08 | Software and data integrity failures | Actions are pinned by commit SHA; base images by tag and digest; exact dependency versions; `npm ci` from the lockfile; no third-party scripts or CDN loads at runtime (so no need for Subresource Integrity); the SBOM is attached to every CI run | The registry and GitHub are trusted. A compromised maintainer of a pinned package would be caught only by the audit after it is reported |
| A09 | Security logging and monitoring failures | 5xx screens show the `X-Correlation-Id`, so a user report can be matched to backend logs | The app reports nothing by itself yet: that is Phase 23 |
| A10 | Server-side request forgery | The app makes no server-side requests. nginx forwards to **one** upstream chosen by the deploy (`API_UPSTREAM`), never by anything in a request | None for this app |

## Other things people ask about

- **CSRF.** Covered above: bearer token in a header, no cookie. The gateway also refuses a browser write whose `Origin` does not match `Host`, so a cross-site form post fails even before authentication.
- **Clickjacking.** `frame-ancestors 'none'` (the modern form of `X-Frame-Options: DENY`, which is therefore not sent).
- **Secrets in the bundle.** `scripts/check-dist.mjs` runs in `npm run verify` and in CI: it fails on a source map, an `.env` file, text shaped like a key, token or password, a backend address (`localhost:8080`, `gateway-service`, `127.0.0.1`...), or any absolute URL that is not on a short allowlist of namespaces that libraries carry (`www.w3.org`, `react.dev`, `reactrouter.com`, `json-schema.org`, and a bare `http://localhost` placeholder base). The only address the app uses is the relative `/api`.
- **The admin area.** It is part of the same bundle, behind the same CSP, and is a route guard in the browser; the real check is the backend's. It adds no extra origin or endpoint.

## How the checks run

| Check | Where | Fails when |
|---|---|---|
| `npm run check:dist` | `npm run verify`, so on a laptop and in CI | a secret, source map, `.env`, backend address or foreign URL is in `dist/` |
| `npm run audit:deps` | CI `verify` job | a High/Critical advisory is not in `audit-allowlist.json`, or an entry has expired or is no longer needed |
| Trivy scan | CI `image` job | the image has a High/Critical finding with a fix available, not accepted in `.trivyignore.yaml` |
| SBOM (CycloneDX) | CI `image` job, artifact `sbom` (90 days) | never fails; made even when the scan fails |
| Header and CSP checks | CI `image` job (curl); `npm run e2e:docker` (headers on five paths; zero CSP violations across the suite) | a header is missing, or the page does something the policy blocks |

To run the image scan on a laptop: `docker run --rm -v /var/run/docker.sock:/var/run/docker.sock ghcr.io/aquasecurity/trivy:0.75.0 image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 ecomdemo-web:<tag>`.

## What is left (suggestions, not built)

- TLS and HSTS at the ingress; a `Strict-Transport-Security` header there once a real domain exists.
- Trusted Types, and a `report-to` endpoint so the browser sends CSP violations from real users (fits Phase 23).
- Dependabot or Renovate for automatic update PRs; a scheduled (not only per-push) CI audit so a new CVE is noticed in a week with no commits.
- Rate limiting in nginx (the gateway already limits per client).
