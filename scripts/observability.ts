// The pure part of "find a reference in Grafana's data sources" (web KI-032): the Loki and Tempo queries a support person
// runs for the reference on the screen (docs/troubleshooting.md), and the reading of their answers. The real service-down
// spec (e2e/observability.spec.ts, `npm run e2e:service-down`) does the I/O; vitest tests this part (observability.test.ts).
// No imports, so both the scripts' and the e2e TypeScript projects can use it.

/** What the backend accepts as a correlation id (the gateway's `CorrelationId`), and what the page shows as a reference. */
const referencePattern = /^[A-Za-z0-9_-]{8,64}$/

/**
 * Refuses anything that is not a correlation id, before it goes into a query. The id is placed inside a LogQL raw string
 * (backticks) and a TraceQL string (double quotes); an id with neither character, nor a backslash, cannot end either early.
 */
export function assertReference(reference: string): string {
  if (!referencePattern.test(reference)) throw new Error(`Not a correlation id: ${JSON.stringify(reference)}`)
  return reference
}

/**
 * LogQL for the gateway's own request line for this reference. `correlation_id` is structured metadata (Alloy's ECS
 * pipeline in the backend), so it is filtered after the stream selector, not as a label. Since backend KI-035 the gateway
 * writes one line per request (`GET /api/products -> 503 in 2003ms`), including the 503 it answers itself.
 */
export function gatewayLineQuery(reference: string): string {
  return `{service_name="gateway-service"} | correlation_id = \`${assertReference(reference)}\``
}

/** LogQL for every service's lines for this reference: the gateway's and those of any service the request reached. */
export function allLinesQuery(reference: string): string {
  return `{service_name=~".+"} | correlation_id = \`${assertReference(reference)}\``
}

/** TraceQL for the gateway's server span, which carries the reference as the span attribute `correlation_id` (backend KI-035). */
export function correlationSpanQuery(reference: string): string {
  return `{ span.correlation_id = "${assertReference(reference)}" }`
}

const withoutTrailingSlash = (base: string) => base.replace(/\/+$/, '')

/** Loki's range query; `start` and `end` are Unix seconds (Loki wants nanoseconds). */
export function lokiQueryRangeUrl(base: string, logql: string, start: number, end: number): string {
  const params = new URLSearchParams({
    query: logql,
    start: `${Math.floor(start)}000000000`,
    end: `${Math.ceil(end)}000000000`,
    limit: '100',
    direction: 'forward',
  })
  return `${withoutTrailingSlash(base)}/loki/api/v1/query_range?${params.toString()}`
}

/** Tempo's search; `start` and `end` are Unix seconds. */
export function tempoSearchUrl(base: string, traceql: string, start: number, end: number): string {
  const params = new URLSearchParams({ q: traceql, start: String(Math.floor(start)), end: String(Math.ceil(end)) })
  return `${withoutTrailingSlash(base)}/api/search?${params.toString()}`
}

/** One log line with its stream's labels, structured metadata included (Loki returns both in `stream`). */
export type LogLine = { line: string; labels: Record<string, string> }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

/** Reads a Loki `query_range` answer for a log query (`resultType: streams`). Anything else is an error, said plainly. */
export function readLokiLines(body: unknown): LogLine[] {
  const data = isRecord(body) ? body['data'] : undefined
  if (!isRecord(data) || data['resultType'] !== 'streams' || !Array.isArray(data['result'])) {
    throw new Error(`Not a Loki streams answer: ${JSON.stringify(body)?.slice(0, 200)}`)
  }
  return data['result'].flatMap((stream: unknown) => {
    if (!isRecord(stream) || !Array.isArray(stream['values'])) return []
    const labels = Object.fromEntries(
      Object.entries(isRecord(stream['stream']) ? stream['stream'] : {}).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    )
    return stream['values'].flatMap((value: unknown) =>
      Array.isArray(value) && typeof value[1] === 'string' ? [{ line: value[1], labels }] : [],
    )
  })
}

/** Tempo writes a trace id as hex without its leading zeros; the W3C form (`traceparent`, the logs) is 32 characters. */
export function normalizeTraceId(id: string): string {
  return id.toLowerCase().padStart(32, '0')
}

export type FoundTrace = { traceId: string; rootServiceName: string; rootTraceName: string }

/** Reads a Tempo search answer. A search that matched nothing has no `traces` at all, which is an empty list, not an error. */
export function readTempoTraces(body: unknown): FoundTrace[] {
  if (!isRecord(body)) throw new Error(`Not a Tempo search answer: ${JSON.stringify(body)?.slice(0, 200)}`)
  const traces = body['traces']
  if (traces === undefined) return []
  if (!Array.isArray(traces)) throw new Error(`Not a Tempo search answer: ${JSON.stringify(body).slice(0, 200)}`)
  return traces.flatMap((trace: unknown) =>
    isRecord(trace) && typeof trace['traceID'] === 'string'
      ? [
          {
            traceId: normalizeTraceId(trace['traceID']),
            rootServiceName: typeof trace['rootServiceName'] === 'string' ? trace['rootServiceName'] : '',
            rootTraceName: typeof trace['rootTraceName'] === 'string' ? trace['rootTraceName'] : '',
          },
        ]
      : [],
  )
}

/** The trace id in a `traceparent` header (`00-<trace id>-<span id>-<flags>`), or undefined. */
export function traceIdOf(traceparent: string | undefined): string | undefined {
  return /^00-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}$/.exec(traceparent ?? '')?.[1]
}

/** The parent span id in a `traceparent` header: the span of the caller (here the browser's fetch span), or undefined. */
export function parentSpanIdOf(traceparent: string | undefined): string | undefined {
  return /^00-[0-9a-f]{32}-([0-9a-f]{16})-[0-9a-f]{2}$/.exec(traceparent ?? '')?.[1]
}

/** Tempo's whole trace by id (web KI-040): every span the trace has, with parents and kinds, which a search does not give. */
export function tempoTraceUrl(base: string, traceId: string): string {
  if (!/^[0-9a-f]{1,32}$/i.test(traceId)) throw new Error(`Not a trace id: ${JSON.stringify(traceId)}`)
  return `${withoutTrailingSlash(base)}/api/v2/traces/${normalizeTraceId(traceId)}`
}

/** One span of a trace, its ids in hex as in `traceparent`; `kind` is `server`, `client`, `internal`... */
export type TraceSpan = {
  serviceName: string
  traceId: string
  spanId: string
  parentSpanId: string
  name: string
  kind: string
  attributes: Record<string, string>
}

const spanKinds = ['unspecified', 'internal', 'server', 'client', 'producer', 'consumer']

/** OTLP JSON writes ids in base64 (Tempo does); hex is accepted too. An empty id (a root's parent) stays empty. */
const hexId = (id: unknown): string => {
  if (typeof id !== 'string' || id === '') return ''
  if (/^[0-9a-f]+$/i.test(id) && (id.length === 16 || id.length === 32)) return id.toLowerCase()
  return Array.from(atob(id), (char) => char.charCodeAt(0).toString(16).padStart(2, '0')).join('')
}

const kindOf = (kind: unknown): string => {
  if (typeof kind === 'number') return spanKinds[kind] ?? String(kind)
  return typeof kind === 'string' ? kind.replace(/^SPAN_KIND_/, '').toLowerCase() : ''
}

const stringAttributes = (attributes: unknown): Record<string, string> =>
  Object.fromEntries(
    (Array.isArray(attributes) ? attributes : []).flatMap((attribute: unknown) => {
      const value = isRecord(attribute) && isRecord(attribute['value']) ? attribute['value']['stringValue'] : undefined
      return isRecord(attribute) && typeof attribute['key'] === 'string' && typeof value === 'string'
        ? [[attribute['key'], value]]
        : []
    }),
  )

const listOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

/** Reads Tempo's trace by id: `/api/v2/traces` (`{ trace: { resourceSpans } }`) or the older `/api/traces` (`{ batches }`). */
export function readTempoTrace(body: unknown): TraceSpan[] {
  const resourceSpans = isRecord(body)
    ? isRecord(body['trace'])
      ? body['trace']['resourceSpans']
      : body['batches']
    : undefined
  if (!Array.isArray(resourceSpans)) throw new Error(`Not a Tempo trace: ${JSON.stringify(body)?.slice(0, 200)}`)
  return resourceSpans.flatMap((resource: unknown) => {
    if (!isRecord(resource)) return []
    const serviceName =
      stringAttributes(isRecord(resource['resource']) ? resource['resource']['attributes'] : [])['service.name'] ?? ''
    return listOf(resource['scopeSpans'] ?? resource['instrumentationLibrarySpans']).flatMap((scope: unknown) =>
      listOf(isRecord(scope) ? scope['spans'] : []).flatMap((span: unknown) =>
        isRecord(span)
          ? [
              {
                serviceName,
                traceId: hexId(span['traceId']),
                spanId: hexId(span['spanId']),
                parentSpanId: hexId(span['parentSpanId']),
                name: typeof span['name'] === 'string' ? span['name'] : '',
                kind: kindOf(span['kind']),
                attributes: stringAttributes(span['attributes']),
              },
            ]
          : [],
      ),
    )
  })
}
