import { afterEach, describe, expect, it, vi } from 'vitest'

const subscribed: string[] = []
const callbacks: Array<(metric: { name: string; value: number; rating: string }) => void> = []

vi.mock('web-vitals', () => {
  const observe = (name: string) => (callback: (typeof callbacks)[number]) => {
    subscribed.push(name)
    callbacks.push(callback)
  }
  return {
    onLCP: observe('LCP'),
    onCLS: observe('CLS'),
    onINP: observe('INP'),
    onFCP: observe('FCP'),
    onTTFB: observe('TTFB'),
  }
})

afterEach(() => {
  subscribed.length = 0
  callbacks.length = 0
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('logWebVitals', () => {
  it('writes each of the five vitals to the console while developing', async () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    const { logWebVitals } = await import('./webVitals')

    logWebVitals()
    callbacks[0]?.({ name: 'LCP', value: 1234.5678, rating: 'good' })

    expect(subscribed.toSorted()).toEqual(['CLS', 'FCP', 'INP', 'LCP', 'TTFB'])
    expect(debug).toHaveBeenCalledWith('[web-vitals] LCP 1234.568 (good)')
  })

  it('does nothing in a production build', async () => {
    vi.stubEnv('DEV', false)
    const { logWebVitals } = await import('./webVitals')

    logWebVitals()

    expect(subscribed).toEqual([])
  })
})
