import { ApiError } from '@/api/errors'

/** The error state of a screen: what went wrong, a reference for support when it is the server's or the network's fault, and a retry. */
export function ErrorPanel({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof ApiError ? error.message : 'Something went wrong while loading this page.'
  // The id helps support find a server-side failure or a request that never arrived; for a 4xx the message says enough.
  const showId = error instanceof ApiError && (error.status === 0 || error.status >= 500)
  const correlationId = error instanceof ApiError ? error.correlationId : null
  return (
    <div role="alert">
      <p>{message}</p>
      {showId && correlationId && (
        // On its own line: an unbreakable UUID after the label overflows a 360 px screen.
        <p>
          Reference for support:
          <br />
          <code>{correlationId}</code>
        </p>
      )}
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  )
}
