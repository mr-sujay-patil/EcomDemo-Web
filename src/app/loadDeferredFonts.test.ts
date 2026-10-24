import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadDeferredFontsAfterFirstPaint } from './loadDeferredFonts'

afterEach(() => {
  delete document.documentElement.dataset.fonts
  vi.unstubAllGlobals()
})

/** A scheduler the test fires by hand. */
function manualSchedule() {
  let run: (() => void) | null = null
  return { schedule: (callback: () => void) => (run = callback), fire: () => run?.() }
}

// The faces the first view can draw in a fallback are requested after the first paint, so on a fast load they no longer end
// before the largest paint, where Lighthouse's simulation would count them against LCP (web KI-042, KI-043).
describe('loadDeferredFontsAfterFirstPaint', () => {
  it('asks for nothing until the scheduler says the page has painted and is idle', () => {
    const load = vi.fn(() => Promise.resolve())
    const { schedule } = manualSchedule()

    loadDeferredFontsAfterFirstPaint(load, schedule)

    expect(load).not.toHaveBeenCalled()
    expect(document.documentElement.dataset.fonts).toBeUndefined()
  })

  it('loads the deferred faces when scheduled, and says so on <html>', async () => {
    const load = vi.fn(() => Promise.resolve())
    const { schedule, fire } = manualSchedule()
    loadDeferredFontsAfterFirstPaint(load, schedule)

    fire()

    expect(load).toHaveBeenCalledOnce()
    await vi.waitFor(() => expect(document.documentElement.dataset.fonts).toBe('all'))
  })

  it('never breaks the page when the stylesheet cannot load: the text stays in its fallback fonts', async () => {
    const { schedule, fire } = manualSchedule()
    loadDeferredFontsAfterFirstPaint(() => Promise.reject(new Error('stylesheet failed')), schedule)

    expect(() => fire()).not.toThrow()

    await vi.waitFor(() => expect(document.documentElement.dataset.fonts).toBe('failed'))
  })

  it('by default loads the real stylesheet', async () => {
    const { schedule, fire } = manualSchedule()
    loadDeferredFontsAfterFirstPaint(undefined, schedule)

    fire()

    await vi.waitFor(() => expect(document.documentElement.dataset.fonts).toBe('all'))
  })

  it('by default waits for the first paint, as tracing does (two animation frames, then idle time)', () => {
    const frames: Array<() => void> = []
    const idle = vi.fn()
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => frames.push(callback))
    vi.stubGlobal('requestIdleCallback', idle)
    window.requestIdleCallback = idle
    const load = vi.fn(() => Promise.resolve())

    loadDeferredFontsAfterFirstPaint(load)
    frames.shift()?.()
    frames.shift()?.()
    expect(load).not.toHaveBeenCalled()
    ;(idle.mock.calls[0]?.[0] as () => void)()

    expect(load).toHaveBeenCalledOnce()
  })
})
