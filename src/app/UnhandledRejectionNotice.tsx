import { useEffect, useState } from 'react'
import { referenceFor, reportError } from './errorReference'
import { RejectionAlert } from './ErrorPages'

/**
 * A promise nobody caught (a failed call in an event handler, say) never reaches an error boundary. This listens for it and
 * shows the reference once: while one alert is on screen, later rejections are written to the console but do not stack up.
 * A cancelled request is the caller's own doing, not a failure.
 */
export function UnhandledRejectionNotice() {
  const [reference, setReference] = useState<string | null>(null)

  useEffect(() => {
    function onRejection(event: PromiseRejectionEvent) {
      const error: unknown = event.reason
      if (error instanceof DOMException && error.name === 'AbortError') return
      const next = referenceFor(error)
      reportError(error, next)
      setReference((shown) => shown ?? next)
    }
    window.addEventListener('unhandledrejection', onRejection)
    return () => window.removeEventListener('unhandledrejection', onRejection)
  }, [])

  return reference ? <RejectionAlert reference={reference} onClose={() => setReference(null)} /> : null
}
