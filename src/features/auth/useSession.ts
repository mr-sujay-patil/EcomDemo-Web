import { useSyncExternalStore } from 'react'
import { useSessionContext } from './SessionProvider'
import type { Role } from './session'

/**
 * Who is signed in, and how to sign in and out. `session` is null when nobody is. The role here only decides
 * what the screen shows; the server checks every call.
 */
export function useSession() {
  const { store, signIn, signOut, expiring } = useSessionContext()
  const { session, endedBy } = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const role: Role | null = session?.profile.role ?? null
  return {
    session,
    profile: session?.profile ?? null,
    role,
    endedBy,
    expiring,
    signIn,
    signOut,
    updateProfile: store.updateProfile,
  }
}
