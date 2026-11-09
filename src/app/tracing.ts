import { context, propagation, trace } from '@opentelemetry/api'
import { CompositePropagator, W3CBaggagePropagator, W3CTraceContextPropagator } from '@opentelemetry/core'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'
import { StackContextManager, TracerProvider } from '@opentelemetry/sdk-trace'

/**
 * Starts a trace in the browser for every call to the API, so the backend's trace (Tempo) begins at the click, not at the
 * gateway. Each `fetch` to `/api` gets a W3C `traceparent` header (`00-<trace id>-<span id>-01`); the gateway continues that
 * trace, and its services after it. Next to `X-Correlation-Id` (src/api/client.ts), which finds a request in the logs,
 * the trace id finds it in Tempo: docs/troubleshooting.md.
 *
 * - Only `/api`: any other URL is ignored, so no header goes anywhere else.
 * - No exporter. The spans are made (that is what gives the header its ids) and then dropped; nothing leaves the browser
 *   for a third party, and the CSP (`connect-src 'self'`) would refuse it anyway.
 * - Imported first in main.tsx, before any request is made.
 */
const provider = new TracerProvider()
// What `WebTracerProvider.register()` did until OpenTelemetry JS 3.0 deprecated the web SDK for `@opentelemetry/sdk-trace`:
// the global tracer provider, the browser's context manager, and the W3C propagators (the `traceparent` header).
trace.setGlobalTracerProvider(provider)
context.setGlobalContextManager(new StackContextManager().enable())
propagation.setGlobalPropagator(
  new CompositePropagator({ propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()] }),
)

registerInstrumentations({
  tracerProvider: provider,
  instrumentations: [
    new FetchInstrumentation({
      // Everything that is not a call to the API is left alone (a regular expression of what to ignore).
      ignoreUrls: [/^(?!.*\/api\/)/],
      // Same origin only: the app never calls another one, and none may get a trace header.
      propagateTraceHeaderCorsUrls: [],
      clearTimingResources: true,
    }),
  ],
})
