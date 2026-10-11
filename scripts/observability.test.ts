import { describe, expect, it } from 'vitest'
import {
  allLinesQuery,
  assertReference,
  correlationSpanQuery,
  gatewayLineQuery,
  lokiQueryRangeUrl,
  normalizeTraceId,
  readLokiLines,
  readTempoTraces,
  tempoSearchUrl,
  traceIdOf,
} from './observability.ts'

const reference = '83132222-06d4-460f-bd71-9969d951d972'

describe('the queries for a reference (web KI-032)', () => {
  it('finds the gateway line by the correlation id in structured metadata', () => {
    expect(gatewayLineQuery(reference)).toBe(`{service_name="gateway-service"} | correlation_id = \`${reference}\``)
  })

  it('finds every service line, the query of Grafana\'s "All logs for this request" link', () => {
    expect(allLinesQuery(reference)).toBe(`{service_name=~".+"} | correlation_id = \`${reference}\``)
  })

  it('finds the gateway span by its correlation_id attribute', () => {
    expect(correlationSpanQuery(reference)).toBe(`{ span.correlation_id = "${reference}" }`)
  })

  it.each(['short', 'has`backtick-0000', 'has"quote-00000', 'has\\slash-0000', 'x'.repeat(65), 'with space 0000'])(
    'refuses %j before it reaches a query',
    (bad) => {
      expect(() => assertReference(bad)).toThrow('Not a correlation id')
      expect(() => gatewayLineQuery(bad)).toThrow()
      expect(() => correlationSpanQuery(bad)).toThrow()
    },
  )

  it('accepts the ids the page and the gateway make', () => {
    expect(assertReference('e2e-down-00000001')).toBe('e2e-down-00000001')
    expect(assertReference(reference)).toBe(reference)
  })
})

describe('the URLs', () => {
  it('asks Loki for a range in nanoseconds, oldest first', () => {
    const url = new URL(
      lokiQueryRangeUrl('http://localhost:23100/', gatewayLineQuery(reference), 1_700_000_000.4, 1_700_000_100.2),
    )
    expect(url.origin + url.pathname).toBe('http://localhost:23100/loki/api/v1/query_range')
    expect(url.searchParams.get('query')).toBe(gatewayLineQuery(reference))
    expect(url.searchParams.get('start')).toBe('1700000000000000000')
    expect(url.searchParams.get('end')).toBe('1700000101000000000')
    expect(url.searchParams.get('direction')).toBe('forward')
  })

  it('asks Tempo to search a range in seconds', () => {
    const url = new URL(
      tempoSearchUrl('http://localhost:3200', correlationSpanQuery(reference), 1_700_000_000.9, 1_700_000_050.1),
    )
    expect(url.origin + url.pathname).toBe('http://localhost:3200/api/search')
    expect(url.searchParams.get('q')).toBe(`{ span.correlation_id = "${reference}" }`)
    expect(url.searchParams.get('start')).toBe('1700000000')
    expect(url.searchParams.get('end')).toBe('1700000051')
  })
})

describe('readLokiLines', () => {
  it('returns each line with its stream labels and structured metadata', () => {
    const body = {
      status: 'success',
      data: {
        resultType: 'streams',
        result: [
          {
            stream: { service_name: 'gateway-service', correlation_id: reference, trace_id: 'ab'.repeat(16) },
            values: [['1700000000000000000', '{"message":"GET /api/products -> 503 in 2003ms"}']],
          },
        ],
      },
    }
    expect(readLokiLines(body)).toEqual([
      {
        line: '{"message":"GET /api/products -> 503 in 2003ms"}',
        labels: { service_name: 'gateway-service', correlation_id: reference, trace_id: 'ab'.repeat(16) },
      },
    ])
  })

  it('reads an answer with no lines as an empty list', () => {
    expect(readLokiLines({ data: { resultType: 'streams', result: [] } })).toEqual([])
  })

  it('refuses an answer that is not a log query result', () => {
    expect(() => readLokiLines({ data: { resultType: 'matrix', result: [] } })).toThrow('Not a Loki streams answer')
    expect(() => readLokiLines('nope')).toThrow('Not a Loki streams answer')
  })
})

describe('readTempoTraces', () => {
  it('returns each trace with its id in the 32-character W3C form', () => {
    const body = {
      traces: [
        {
          traceID: 'e7bf1ed09212e483437da129dd02560',
          rootServiceName: 'gateway-service',
          rootTraceName: 'http get /fallback/catalog',
        },
      ],
    }
    expect(readTempoTraces(body)).toEqual([
      {
        traceId: '0e7bf1ed09212e483437da129dd02560',
        rootServiceName: 'gateway-service',
        rootTraceName: 'http get /fallback/catalog',
      },
    ])
  })

  it('reads a search that found nothing (no `traces` field) as an empty list', () => {
    expect(readTempoTraces({ metrics: {} })).toEqual([])
  })

  it('refuses an answer that is not a search result', () => {
    expect(() => readTempoTraces(null)).toThrow('Not a Tempo search answer')
    expect(() => readTempoTraces({ traces: 'x' })).toThrow('Not a Tempo search answer')
  })
})

describe('trace ids', () => {
  it('pads and lower-cases a Tempo id', () => {
    expect(normalizeTraceId('ABC')).toBe(`${'0'.repeat(29)}abc`)
  })

  it('takes the trace id from a traceparent, and nothing from anything else', () => {
    expect(traceIdOf('00-459cd510c7427270a26ed3d58dbee04b-17d23017bf0d1b96-01')).toBe(
      '459cd510c7427270a26ed3d58dbee04b',
    )
    expect(traceIdOf('')).toBeUndefined()
    expect(traceIdOf(undefined)).toBeUndefined()
    expect(traceIdOf('01-459cd510c7427270a26ed3d58dbee04b-17d23017bf0d1b96-01')).toBeUndefined()
  })
})
