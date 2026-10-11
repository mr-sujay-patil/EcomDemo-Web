# Troubleshooting: from a reference on the screen to the request in Grafana

When something breaks, the shopper sees a calm page with **Reference: `<id>`** and a Copy button. This page is for the developer who receives that reference: how to find what happened. Everything here was done on a real failure (the worked example below), against the backend pinned in `docs/process/development-environment.md`.

## The three identifiers

| What | Where it comes from | What it finds |
|---|---|---|
| **Reference** = `X-Correlation-Id` | made by the browser for every call (`src/api/client.ts`), reused by the gateway, echoed in the response, written by the gateway (since backend KI-035) and every backend service into its log lines (`correlation_id`), and put on the gateway's server span (`span.correlation_id`) | the **log lines** (Loki) of the gateway and the services that handled the request, and the **trace** (Tempo, TraceQL) |
| **Trace id** | made by the browser for every call to `/api` **made after the first paint** (`src/app/tracing.ts`, started by `src/app/startTracing.ts`; see below), sent as `traceparent: 00-<trace id>-<span id>-01`; the gateway and every service continue it | the **trace** (Tempo): which services ran, in what order, how long each took |
| `traceId` in a log line | the same trace id, written by each service next to the correlation id | the step from a log line to its trace |

So a correlation id is a request's name in the logs, and a trace id is its name in Tempo. A request that reached a service has both in the same log line, which links the two. A reference on screen is a failed call's correlation id; a render error (a bug in the page, no request) gets a fresh id that is **only** in the browser console of the person who saw it (`[reference <id>]`, with the error).

## When tracing starts, and what it means for the first calls

Tracing is its own chunk of JavaScript, loaded after the page's first paint, when the browser is idle (web KI-033: loaded up front it pushed the Lighthouse score to the edge of its budget). `<html data-tracing="on">` says it is running (`failed` if its code could not load; the page works either way). **A call made before that, such as the shelf's first request on a fresh page load, has an `X-Correlation-Id` and no `traceparent`; every call after it has both.** So for a failure on first load, the reference still finds the logs of the services that saw it, but the trace id is not in the request. Two ways to a trace id in that case: press **Retry** (the new call carries a `traceparent` and its own new reference), or find the trace by time and route (TraceQL, Path 2).

## Before you start

- The stack: Grafana `http://localhost:3000` (user and password from the backend's `.env`; its `compose.yaml` shows the defaults), Loki `:3100`, Tempo `:3200`, all bound to 127.0.0.1.
- **Start the stack with `bash scripts/backend-stack.sh up`, or Loki has no logs.** The backend's Alloy (the log shipper) keeps only containers whose compose project label is exactly `ecomdemo` (`docker/alloy/config.alloy`, two `regex` lines), and this repo's clone runs as project `ecomdemo-backend-readonly`. Since web KI-039 the wrapper handles it: at every start it copies the clone's own `config.alloy` to `.local/backend-stack/config.alloy` with those two rules keeping this stack's project (`scripts/alloy-override.mjs`) and mounts the copy over Alloy's config; CI starts its stack the same way. `bash scripts/backend-stack.sh config` shows the mounted file on the `alloy` line. A plain `docker compose up` in the clone skips it and gets a Loki with **no logs at all**, with no error (traces are not affected). If the start stops with an `alloy-override:` error, the backend changed its Alloy config or service: read the change before going on. Never run the clone as project `ecomdemo` (its volumes would be the backend team's).

## Path 1: the request reached a service (the usual case)

1. **Loki.** In Grafana, Explore, the Loki data source, `{service_name=~".+"} | correlation_id="<reference>"`. The gateway (since backend KI-035) and each service that handled the request have a line (`GET /api/products -> 200 in 19ms`), with `correlation_id` and `trace_id` as fields.
2. **Tempo.** Click `traceId` in the line (Grafana's Loki data source turns it into a link), or Explore, Tempo, "TraceQL" or "Trace ID", paste it; or TraceQL `{ span.correlation_id = "<reference>" }` (Path 2). The trace shows the gateway span and every service behind it.

From a terminal, the same, with the stack's ports:

```
curl -sG localhost:3100/loki/api/v1/query_range \
  --data-urlencode 'query={service_name=~".+"} | correlation_id="<reference>"' \
  --data-urlencode "start=$(( $(date +%s) - 900 ))000000000" --data-urlencode "end=$(date +%s)000000000"
curl -s localhost:3200/api/traces/<trace id>
```

**Worked example, a healthy request** (`curl` with a chosen correlation id and `traceparent`, which is exactly what the browser sends): correlation id `e2e-probe3-1791477050`, trace id `abe43b7fdb8d00c78367f33184964926`. Loki returned one line, from `catalog-service`: `GET /api/products -> 200 in 19ms`, carrying `trace_id=abe43b7f…`. Tempo returned the trace with spans from `gateway-service`, `catalog-service` and `inventory-service`. The id the client chose is the id in the logs, and the trace id the client chose is the trace.

## Path 2: the gateway answered it itself (a service is down or slow)

When a catalogue service is down, the gateway answers `503` after its 2-second limit (circuit breaker, `/fallback/catalog`), and no backend service sees the request. **Since backend KI-035 (pinned from `a85202f`, web KI-032) the reference finds it anyway**, in both places:

1. **Loki, the gateway's own line.** The gateway writes one line per request (`GET /api/products -> 503 in 2003ms`) with `correlation_id` and `traceId` in the ECS JSON; Alloy puts both in structured metadata. In Explore, Loki: `{service_name="gateway-service"} | correlation_id = "<reference>"`, or Path 1's query for every service (here the gateway's line is the only one there is). The line's `trace_id` field is the trace.
2. **Tempo, by the reference alone.** The gateway's server span carries the attribute `correlation_id`, so Explore, Tempo, TraceQL: `{ span.correlation_id = "<reference>" }`. This works **also for a failure on first load**, whose call had no `traceparent` (tracing starts after the first paint): the gateway started the trace itself and named it with the reference.
3. **Grafana's links.** From a log line, `traceId` opens the trace, and the derived field **"All logs for this request"** queries `{service_name=~".+"} | correlation_id = …` (every service since KI-035; it used to look in `app` only).

From a terminal, with the stack's ports (`bash scripts/backend-stack.sh env` prints the shifted ones, `LOKI_URL` and `TEMPO_URL`):

```
curl -sG localhost:3100/loki/api/v1/query_range \
  --data-urlencode 'query={service_name="gateway-service"} | correlation_id = `<reference>`' \
  --data-urlencode "start=$(( $(date +%s) - 900 ))000000000" --data-urlencode "end=$(date +%s)000000000"
curl -sG localhost:3200/api/search --data-urlencode 'q={ span.correlation_id = "<reference>" }' \
  --data-urlencode "start=$(( $(date +%s) - 900 ))" --data-urlencode "end=$(date +%s)"
```

**How it is proven.** `npm run e2e:service-down` (stops the catalogue container, runs one spec, starts it again) takes both references the shelf shows, the first call's (no `traceparent`) and the Retry's, through exactly these two queries: one gateway line with `-> 503` and a trace id, and one trace with that id, rooted in `gateway-service` (for the Retry, the trace the browser started). The queries live in `scripts/observability.ts`. The spec needs Loki to have this stack's logs (the ⚠️ under "Before you start"). The backend's own compose smoke test checks the gateway's line for its own `503` from `/fallback/catalog` on every run. Without the trace id or the reference, TraceQL by what the failure looks like still works: `{ resource.service.name = "gateway-service" && name = "http get /fallback/catalog" }` around the time the shopper reports.

**Before KI-035 (Phase 23, kept for the record).** On a real failure, reference `83132222-06d4-460f-bd71-9969d951d972`, `traceparent: 00-ee7bf1ed09212e483437da129dd02560-c7359b900dfa278f-01`: Loki had nothing for the reference or the trace id (the gateway logged no request), and Tempo had the trace (`gateway-service`, `http get /fallback/catalog`, 1068 ms, with a short `evalsha`, the rate limiter's Redis call) only by its trace id, taken from the browser's request headers. With tracing after the first paint (web KI-033) a first-load failure had no trace id at all; a second run used Retry (`911d2dbb-8ce5-4919-a094-8dadca732bd9`, trace `459cd510c7427270a26ed3d58dbee04b`, 257 ms with the breaker open). Screenshots: `docs/test-reports/phase-23/shelf-service-down-*.png`.

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
