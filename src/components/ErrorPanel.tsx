import { ApiError, retryHint, supportReference } from '@/api/errors'
import { Alert } from './Alert'
import { Button } from './Button'
import { ErrorReference } from './ErrorReference'

/** The error state of a screen: what went wrong, a reference for support when it is the server's or the network's fault, and a retry. */
export function ErrorPanel({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof ApiError ? error.message : 'Something went wrong while loading this page.'
  const correlationId = supportReference(error)
  const hint = retryHint(error)
  return (
    <Alert tone="danger" title={message}>
      <div className="stack">
        {hint && <p>{hint}</p>}
        {correlationId && <ErrorReference reference={correlationId} />}
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </Alert>
  )
}
