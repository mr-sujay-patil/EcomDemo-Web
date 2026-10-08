import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web'

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
const provider = new WebTracerProvider()
// Registers the W3C Trace Context propagator (the `traceparent` header) as the global one.
provider.register()

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
