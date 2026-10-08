import { afterEach, describe, expect, it, vi } from 'vitest'
import { startTracingAfterFirstPaint } from './startTracing'

afterEach(() => {
  delete document.documentElement.dataset.tracing
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

/** A scheduler the test fires by hand. */
function manualSchedule() {
  let run: (() => void) | null = null
  return { schedule: (callback: () => void) => (run = callback), fire: () => run?.() }
}

describe('startTracingAfterFirstPaint', () => {
  it('loads nothing until the scheduler says the page has painted and is idle', () => {
    const load = vi.fn(() => Promise.resolve())
    const { schedule } = manualSchedule()

    startTracingAfterFirstPaint(load, schedule)

    expect(load).not.toHaveBeenCalled()
    expect(document.documentElement.dataset.tracing).toBeUndefined()
  })

  it('loads tracing when scheduled, and says so on <html>', async () => {
    const load = vi.fn(() => Promise.resolve())
    const { schedule, fire } = manualSchedule()
    startTracingAfterFirstPaint(load, schedule)

    fire()

    expect(load).toHaveBeenCalledOnce()
    await vi.waitFor(() => expect(document.documentElement.dataset.tracing).toBe('on'))
  })

  it('never breaks the page when the tracing code cannot load: it says so and goes on', async () => {
    const { schedule, fire } = manualSchedule()
    startTracingAfterFirstPaint(() => Promise.reject(new Error('chunk failed')), schedule)

    expect(() => fire()).not.toThrow()

    await vi.waitFor(() => expect(document.documentElement.dataset.tracing).toBe('failed'))
  })

  it('by default loads the real tracing code', async () => {
    const { schedule, fire } = manualSchedule()
    startTracingAfterFirstPaint(undefined, schedule)

    fire()

    await vi.waitFor(() => expect(document.documentElement.dataset.tracing).toBe('on'))
  })

  it('by default waits two animation frames and then the idle time', () => {
    const frames: Array<() => void> = []
    const idle = vi.fn()
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => frames.push(callback))
    vi.stubGlobal('requestIdleCallback', idle)
    window.requestIdleCallback = idle
    const load = vi.fn(() => Promise.resolve())

    startTracingAfterFirstPaint(load)
    expect(frames).toHaveLength(1)
    frames.shift()?.()
    expect(frames).toHaveLength(1)
    expect(idle).not.toHaveBeenCalled()
    frames.shift()?.()

    expect(idle).toHaveBeenCalledOnce()
    expect(idle.mock.calls[0]?.[1]).toEqual({ timeout: 3000 })
    expect(load).not.toHaveBeenCalled()
    ;(idle.mock.calls[0]?.[0] as () => void)()
    expect(load).toHaveBeenCalledOnce()
  })

  it('uses a 200 ms timer where the browser has no idle callback', () => {
    vi.useFakeTimers()
    const frames: Array<() => void> = []
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => frames.push(callback))
    Reflect.deleteProperty(window, 'requestIdleCallback')
    const load = vi.fn(() => Promise.resolve())

    startTracingAfterFirstPaint(load)
    frames.shift()?.()
    frames.shift()?.()
    expect(load).not.toHaveBeenCalled()
    vi.advanceTimersByTime(199)
    expect(load).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)

    expect(load).toHaveBeenCalledOnce()
  })
})
