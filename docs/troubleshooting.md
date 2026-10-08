# Troubleshooting: from a reference on the screen to the request in Grafana

When something breaks, the shopper sees a calm page with **Reference: `<id>`** and a Copy button. This page is for the developer who receives that reference: how to find what happened. Everything here was done on a real failure (the worked example below), against the backend pinned in `docs/process/development-environment.md`.

## The three identifiers

| What | Where it comes from | What it finds |
|---|---|---|
| **Reference** = `X-Correlation-Id` | made by the browser for every call (`src/api/client.ts`), reused by the gateway, echoed in the response, written by every backend service into its log lines (`correlation_id`) | the **log lines** (Loki) of the services that handled the request |
| **Trace id** | made by the browser for every call to `/api` (`src/app/tracing.ts`), sent as `traceparent: 00-<trace id>-<span id>-01`; the gateway and every service continue it | the **trace** (Tempo): which services ran, in what order, how long each took |
| `traceId` in a log line | the same trace id, written by each service next to the correlation id | the step from a log line to its trace |

So a correlation id is a request's name in the logs, and a trace id is its name in Tempo. A request that reached a service has both in the same log line, which links the two. A reference on screen is a failed call's correlation id; a render error (a bug in the page, no request) gets a fresh id that is **only** in the browser console of the person who saw it (`[reference <id>]`, with the error).

## Before you start

- The stack: Grafana `http://localhost:3000` (user and password from the backend's `.env`; its `compose.yaml` shows the defaults), Loki `:3100`, Tempo `:3200`, all bound to 127.0.0.1.
- ⚠️ **Logs only reach Loki if the compose project is named `ecomdemo`.** Alloy (the log shipper) keeps only containers whose compose project label is exactly `ecomdemo` (`docker/alloy/config.alloy`, two `regex` lines). A clone in a folder with another name (here `ecomdemo-backend-readonly`) gets a Loki with **no logs at all**, with no error. Traces are not affected. Do not "fix" it by running the stack as project `ecomdemo` on a machine that also has the backend team's volumes; use a local override file that mounts a copy of `config.alloy` with your project name (what was done for the worked example), or run the stack from a folder named `ecomdemo`.

## Path 1: the request reached a service (the usual case)

1. **Loki.** In Grafana, Explore, the Loki data source, `{service_name=~".+"} | correlation_id="<reference>"`. Each service that handled the request has a line (`GET /api/products -> 200 in 19ms`), with `correlation_id` and `trace_id` as fields.
2. **Tempo.** Click `traceId` in the line (Grafana's Loki data source turns it into a link), or Explore, Tempo, "TraceQL" or "Trace ID", paste it. The trace shows the gateway span and every service behind it.

From a terminal, the same, with the stack's ports:

```
curl -sG localhost:3100/loki/api/v1/query_range \
  --data-urlencode 'query={service_name=~".+"} | correlation_id="<reference>"' \
  --data-urlencode "start=$(( $(date +%s) - 900 ))000000000" --data-urlencode "end=$(date +%s)000000000"
curl -s localhost:3200/api/traces/<trace id>
```

**Worked example, a healthy request** (`curl` with a chosen correlation id and `traceparent`, which is exactly what the browser sends): correlation id `e2e-probe3-1791477050`, trace id `abe43b7fdb8d00c78367f33184964926`. Loki returned one line, from `catalog-service`: `GET /api/products -> 200 in 19ms`, carrying `trace_id=abe43b7f…`. Tempo returned the trace with spans from `gateway-service`, `catalog-service` and `inventory-service`. The id the client chose is the id in the logs, and the trace id the client chose is the trace.

## Path 2: the gateway answered it itself (a service is down or slow)

This is the case the phase was about, and **the reference alone does not lead anywhere yet**.

When a catalogue service is down, the gateway answers `503` after its 2-second limit (circuit breaker, `/fallback/catalog`). No backend service sees the request, and the **gateway writes no request log line** (the backend lists this as its KI-035; `CorrelationIdWebFilter` stamps the id but, being reactive, puts it in no log). So searching Loki for the reference finds **nothing**, and so does searching by trace id. What remains is the trace:

1. In the browser: DevTools, Network, the failed `/api/products` request, **Request Headers, `traceparent`**. Its second field is the trace id. (This is the one thing a support person cannot get from the shopper, who has only the reference. The page does not show the trace id.)
2. Tempo, by that trace id.
3. Without the trace id: TraceQL by what the failure looks like, for example `{ resource.service.name = "gateway-service" && name = "http get /fallback/catalog" }` around the time the shopper reports.

**Worked example, the real failure.** The catalogue service container was stopped (`scripts/e2e-service-down.sh`, which always starts it again) and the shelf opened:

- The page showed *"The product catalogue is temporarily unavailable. Please try again shortly."* and **Reference `83132222-06d4-460f-bd71-9969d951d972`** (screenshots: `docs/test-reports/phase-23/shelf-service-down-*.png`; the header and footer stayed usable).
- The request carried `X-Correlation-Id: 83132222-06d4-460f-bd71-9969d951d972` and `traceparent: 00-ee7bf1ed09212e483437da129dd02560-c7359b900dfa278f-01`; the response echoed the same correlation id.
- **Loki:** no line for `correlation_id="83132222-…"`, none for `trace_id="ee7bf1ed…"`, in any service. As expected: nothing past the gateway ran.
- **Tempo, trace `ee7bf1ed09212e483437da129dd02560`:** `gateway-service`, `http get /fallback/catalog`, 1068 ms, with a short `evalsha` (the rate limiter's Redis call). The browser's trace id is the trace, so the browser really started it.

What would close the gap is for the **gateway to log one line per request** with the correlation id and the trace id, or to put the correlation id on its server span. That is a backend change; it is recorded as web KI-032 for the owner to relay. Until then, Path 2 needs the trace id or the time.

## What the page can and cannot catch

- **Error boundaries** (`src/app/ErrorPages.tsx`, `RootErrorBoundary.tsx`, the router's `errorElement`s) catch errors **while React renders** a route or the layout. They do not catch errors in event handlers or in async code, and not in the boundary itself.
- A call that fails inside a screen shows that screen's own error state (`ErrorPanel`: the server's message, the reference, Copy, Retry). A promise nobody caught shows one alert with a reference (`UnhandledRejectionNotice`), once, and logs the rest to the console.
- Where a failure is shown, which page, and what the reference is:

| Failure | What the shopper sees | Reference |
|---|---|---|
| A call fails with a 5xx or no answer | the screen's error state, or the alert | the call's correlation id |
| A route component throws while rendering | the page "This page did not load", header and footer intact | the correlation id if the error is an API error, otherwise a fresh id (console only) |
| The layout, or anything outside the router, throws | the page "Something went wrong" alone | the same |
| A promise nobody caught | one alert | the same |

## Web Vitals

In development (`npm run dev`) the page's LCP, CLS, INP, FCP and TTFB are written to the browser console as `[web-vitals] LCP 1234.5 (good)`. A production build contains none of it and sends nothing anywhere; the numbers that gate the build are Lighthouse's (`docs/performance.md`).
