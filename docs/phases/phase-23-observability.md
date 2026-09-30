# Phase 23: Observability

| | |
|---|---|
| **Stage** | Stage 5: Quality |
| **Technology** | Error reporting + trace propagation |
| **Branch** | `feature/phase-23-observability` |
| **PR title** | `Phase 23: Observability` |
| **Requires** | `phase-22-complete` on `main`; backend tracing (Tempo) at the pinned tag |
| **Needs from the backend** | `X-Correlation-Id`; backend tracing (Tempo) |
| **Completion tag** | `phase-23-complete` |

> Claude Code: implement **only** this file's scope. Follow `docs/process/execution-protocol.md` for the lifecycle, `docs/process/testing-protocol.md` before raising the PR, and `docs/process/git-workflow.md` for every Git action. API work follows `docs/backend/integration-guide.md`; UI work from Phase 9 follows `design-system/README.md` and `design-system/patterns.md`. A missing backend dependency means STOP (CLAUDE.md rule 10).

**Goal:** When something breaks, the shopper sees a calm page with a reference, and the developer can follow that request from the browser through the gateway into the backend's logs and traces.

**What you'll implement**
- Error boundaries: one at the root (a full page in the store's voice with "Reference: …" and a link home) and one per route (header and footer stay usable); the router's `errorElement`s use the same components. A global handler for unhandled rejections shows the same reference `Alert` once.
- The reference is the `X-Correlation-Id` the client sent and the gateway echoed; copy to clipboard.
- OpenTelemetry Web: the fetch instrumentation propagating W3C `traceparent` on `/api` requests only, so backend traces (Tempo) start in the browser. No third-party exporter; an optional OTLP export in dev only if the backend's collector accepts browser traffic (check; if it needs a backend change, stop, rule 10).
- Web Vitals (`web-vitals`) logged in dev and recorded in the test report; no analytics service.
- `docs/troubleshooting.md`: from a reference on screen to the request in Grafana (Loki by correlation id, Tempo by trace), with a worked example from a real failure.

**Concepts to understand**
- Error boundaries and what they can't catch
- Correlation ids versus trace context
- W3C Trace Context end to end

**Done when**
- With a backend service stopped, the shelf shows the reference page, and that reference finds the gateway's log line and the trace (steps and screenshots in the report); a render error is caught by the route boundary while the layout stays usable (test).

**Not in this phase:** a frontend log-shipping service.

## E2E additions (`e2e/`)

Backend-service-down scenario (the user stops and restarts it, or allows Claude Code to): the reference page, not a blank screen; every `/api` request carries `traceparent` and `X-Correlation-Id`.

## Your manual steps (user)

Allow stopping and restarting one backend service for the failure test, or run those commands yourself when asked. After this phase, tag `v1.0`.
