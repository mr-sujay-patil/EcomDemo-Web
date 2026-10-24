/** Runs work the first view does not need: two animation frames (the first has painted when the second starts), then the browser's idle time, or 200 ms where it has none. */
export type Schedule = (run: () => void) => void

export const afterFirstPaint: Schedule = (run) => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 })
      else setTimeout(run, 200)
    })
  })
}
