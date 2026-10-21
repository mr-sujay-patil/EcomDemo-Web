import { describe, expect, it } from 'vitest'
import { describeLcpInputs, lcpInputs } from './perf-lcp-inputs.mjs'

// Lighthouse does not slow the page down: it loads it once at full speed, then simulates the slow phone. For LCP the simulation
// replays every request that ENDED BEFORE THE OBSERVED LCP on the slow link (web KI-043), so which requests those were decides the
// number. CI cannot be reproduced here (it measures after the whole e2e suite, against the live backend), so the report prints them.

const request = (url: string, resourceType: string, networkEndTime: number, transferSize = 1000) => ({
  url: `http://localhost:8070${url}`,
  resourceType,
  networkEndTime,
  transferSize,
})

const run = (requests: ReturnType<typeof request>[], fcp = 400, lcp = 600, domElements = 900) => ({
  audits: {
    metrics: { details: { items: [{ observedFirstContentfulPaint: fcp, observedLargestContentfulPaint: lcp }] } },
    'network-requests': { details: { items: requests } },
    'dom-size': { numericValue: domElements },
  },
})

describe('perf-lcp-inputs: what the simulated LCP is built from', () => {
  it('keeps only the requests that ended before the observed LCP, counted and summed by type', () => {
    const inputs = lcpInputs(
      run([
        request('/', 'Document', 50, 2000),
        request('/assets/index.js', 'Script', 200, 30_000),
        request('/assets/vendor.js', 'Script', 250, 100_000),
        request('/api/products?page=0&size=100', 'Fetch', 300, 5000),
        request('/api/products/1/image', 'Image', 590, 40_000),
        request('/api/products/2/image', 'Image', 700, 40_000),
      ]),
    )

    expect(inputs).toMatchObject({ fcp: 400, lcp: 600, before: 5, total: 6, domElements: 900 })
    expect(inputs.byType).toEqual([
      { type: 'Script', count: 2, bytes: 130_000 },
      { type: 'Image', count: 1, bytes: 40_000 },
      { type: 'Fetch', count: 1, bytes: 5000 },
      { type: 'Document', count: 1, bytes: 2000 },
    ])
    expect(inputs.data).toEqual(['/api/products?page=0&size=100', '/api/products/1/image'])
  })

  it('ignores a request that never ended (no end time), and one that ended exactly at the LCP counts', () => {
    const inputs = lcpInputs(
      run([request('/a.js', 'Script', Number.NaN), request('/b.js', 'Script', 600), request('/c.js', 'Script', 601)]),
    )

    expect(inputs.before).toBe(1)
    expect(inputs.total).toBe(3)
  })

  it('reads a run without the DOM audit or any request as unknown, not as zero', () => {
    const inputs = lcpInputs({
      audits: {
        metrics: { details: { items: [{ observedFirstContentfulPaint: 1, observedLargestContentfulPaint: 2 }] } },
      },
    })

    expect(inputs).toMatchObject({ before: 0, total: 0, domElements: undefined, byType: [], data: [] })
  })

  it('prints one line a person can read in a CI log, the gap between first paint and LCP first', () => {
    const line = describeLcpInputs(
      '/',
      lcpInputs(
        run([
          request('/assets/index.js', 'Script', 200, 30_720),
          request('/api/products/1/image', 'Image', 590, 40_960),
        ]),
      ),
    )

    expect(line).toBe(
      '- /: observed FCP 400 ms, LCP 600 ms (+200 ms); 2 of 2 requests ended before the observed LCP: ' +
        'Image 1 (40.0 KB), Script 1 (30.0 KB); data and photos among them: /api/products/1/image; DOM 900 elements',
    )
  })

  it('says so when no data or photo request ended before the LCP, and when the DOM size is unknown', () => {
    const line = describeLcpInputs('/products/1', { ...lcpInputs(run([])), domElements: undefined })

    expect(line).toContain('0 of 0 requests')
    expect(line).toContain('data and photos among them: none')
    expect(line).toContain('DOM ? elements')
  })
})
