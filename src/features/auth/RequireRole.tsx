import { Navigate, Outlet, useLocation } from 'react-router'
import { NotPermittedPage } from './NotPermittedPage'
import { signInPath } from './nextPath'
import type { Role } from './session'
import { useSession } from './useSession'

/**
 * A guard around routes that need a signed-in account of one role. Signed out: to `/sign-in?next=…`, and back
 * afterwards. Signed in as the wrong role: "Not permitted", in place (a 403 is not a login prompt). The guard only
 * mirrors the server, which checks every call; it is never the protection.
 */
export function RequireRole({ role }: { role: Role }) {
  const { session, role: mine } = useSession()
  const location = useLocation()

  if (session === null) return <Navigate to={signInPath(location)} replace />
  if (mine !== role) return <NotPermittedPage />
  return <Outlet />
}
