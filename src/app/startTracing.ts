/**
 * Starts tracing (src/app/tracing.ts) after the page's first paint, not before it.
 *
 * Tracing is the browser's half of a trace: it puts a W3C `traceparent` on the calls to `/api` (docs/troubleshooting.md).
 * Loaded up front it cost the shelf about 16 KB of JavaScript and main-thread time before anything showed: the Lighthouse score
 * on a slow CI runner dropped to the edge of its budget (web KI-033). So its code is a chunk of its own, requested when the
 * browser has painted and is idle. **The price:** a call made before then (the shelf's first request) has an `X-Correlation-Id`
 * but no `traceparent`; every call after it has both.
 *
 * `<html data-tracing="on">` says tracing is running (`failed` if its code could not load); tests and the troubleshooting guide
 * read it. A failure to load never breaks the page: tracing is a help for developers, not part of the shop.
 */
type Load = () => Promise<unknown>
type Schedule = (run: () => void) => void

/** Two animation frames (the first has painted when the second starts), then the browser's idle time, or 200 ms where it has none. */
const afterFirstPaint: Schedule = (run) => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 })
      else setTimeout(run, 200)
    })
  })
}

export function startTracingAfterFirstPaint(
  load: Load = () => import('./tracing'),
  schedule: Schedule = afterFirstPaint,
) {
  schedule(() => {
    load().then(
      () => {
        document.documentElement.dataset.tracing = 'on'
      },
      () => {
        document.documentElement.dataset.tracing = 'failed'
      },
    )
  })
}
