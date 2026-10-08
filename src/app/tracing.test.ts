import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// The instrumentation wraps `window.fetch` when tracing.ts is imported, so the fake network goes in first.
const sent: Request[] = []
const originalFetch = globalThis.fetch

beforeAll(async () => {
  globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    sent.push(new Request(input instanceof Request ? input : new URL(String(input), 'http://localhost'), init))
    return Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }))
  })
  await import('./tracing')
})
afterAll(() => {
  globalThis.fetch = originalFetch
})

describe('tracing', () => {
  it('sends a W3C traceparent with a call to the API', async () => {
    await fetch(`${location.origin}/api/products`)

    const headers = sent.at(-1)?.headers
    expect(headers?.get('traceparent')).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/)
  })

  it('starts a new trace for each call', async () => {
    await fetch(`${location.origin}/api/products/1`)
    await fetch(`${location.origin}/api/products/2`)

    const [first, second] = sent.slice(-2).map((request) => request.headers.get('traceparent')?.split('-')[1])
    expect(first).toBeTruthy()
    expect(second).toBeTruthy()
    expect(first).not.toBe(second)
  })

  it('adds nothing to a request for anything else', async () => {
    await fetch(`${location.origin}/assets/app.js`)

    expect(sent.at(-1)?.headers.get('traceparent')).toBeNull()
  })

  it('adds nothing to a request to another site', async () => {
    await fetch('https://example.com/api/products')

    expect(sent.at(-1)?.headers.get('traceparent')).toBeNull()
  })
})
