import { Alert } from '@/components/Alert'
import { useSession } from './useSession'

/** A quiet notice for the last minute of a session. There is no refresh, so all it can offer is time to finish. */
export function ExpiryNotice() {
  const { expiring } = useSession()
  if (!expiring) return null
  return (
    <div className="page expiry-notice">
      <Alert tone="warning" title="You'll be signed out in a minute">
        Finish what you're doing, then sign in again to carry on where you were.
      </Alert>
    </div>
  )
}
