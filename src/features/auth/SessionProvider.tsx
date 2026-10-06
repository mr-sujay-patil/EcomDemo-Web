import { useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { setAccessTokenProvider, setTokenRejectedHandler } from '@/api/client'
import { fetchProfile, login, type LoginRequest } from './api'
import { createDraftStore, type DraftStore } from './drafts'
import { createSessionStore, expiryOf, WARN_BEFORE_MS, type Session, type SessionStore } from './session'

type SessionContextValue = {
  store: SessionStore
  drafts: DraftStore
  signIn: (credentials: LoginRequest) => Promise<void>
  signOut: () => void
  /** True during the last minute before the session ends. */
  expiring: boolean
}

const SessionContext = createContext<SessionContextValue | null>(null)

/** Where the largest `setTimeout` delay ends: a longer one fires at once. */
const MAX_TIMEOUT_MS = 2 ** 31 - 1

/**
 * Owns the session for the whole app: hands the API client its token and its 401 handler, ends the session
 * at expiry (and warns a minute before), and clears the person's data from the query cache whenever it ends.
 * Must sit inside the `QueryClientProvider`.
 */
export function SessionProvider({ store: given, children }: { store?: SessionStore; children: ReactNode }) {
  const [store] = useState(() => given ?? createSessionStore())
  const [drafts] = useState(createDraftStore)
  const queryClient = useQueryClient()
  const { session } = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [expiring, setExpiring] = useState(false)

  // The API client is not React: it reads the token and reports a refused one through these two hooks.
  useEffect(() => {
    setAccessTokenProvider(store.token)
    setTokenRejectedHandler(store.reject)
    return () => {
      setAccessTokenProvider(null)
      setTokenRejectedHandler(null)
    }
  }, [store])

  // Whatever ends the session, the next person at this browser must not find the last one's data. Only the
  // catalogue (the same for everyone) stays; any other key is dropped, so a new feature is safe by default.
  useEffect(
    () =>
      store.subscribe(() => {
        if (store.getSnapshot().session === null) {
          queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'catalog' })
        }
      }),
    [store, queryClient],
  )

  // The clock: warn in the last minute, end the session at `expiresAt`. A laptop that sleeps pauses timers, so
  // the check also runs whenever the page becomes visible or focused again.
  useEffect(() => {
    if (session === null) return undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    function check() {
      clearTimeout(timer)
      const left = (session as Session).expiresAt - Date.now()
      if (left <= 0) {
        store.end('expired')
        return
      }
      const warning = left <= WARN_BEFORE_MS
      setExpiring(warning)
      timer = setTimeout(check, Math.min(MAX_TIMEOUT_MS, warning ? left : left - WARN_BEFORE_MS))
    }
    function recheck() {
      if (document.visibilityState === 'visible') check()
    }
    check()
    document.addEventListener('visibilitychange', recheck)
    window.addEventListener('focus', recheck)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', recheck)
      window.removeEventListener('focus', recheck)
    }
  }, [session, store])

  const signIn = useCallback(
    async (credentials: LoginRequest) => {
      const token = await login(credentials)
      const now = Date.now()
      const expiresAt = expiryOf(token, now)
      if (!token.accessToken || expiresAt === null) throw new Error('The server answered without a session.')
      // The profile (name, role) comes from the server, not from decoding the token: decoding shows, it does not verify.
      const profile = await fetchProfile(token.accessToken)
      store.start({ accessToken: token.accessToken, expiresAt, profile })
    },
    [store],
  )

  const signOut = useCallback(() => {
    // Deliberate: the drafts go too. (An expiry or a refused token keeps them, so the person can pick up where they were.)
    drafts.clear()
    store.end('signed-out')
  }, [store, drafts])

  const value = useMemo(
    () => ({ store, drafts, signIn, signOut, expiring }),
    [store, drafts, signIn, signOut, expiring],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSessionContext(): SessionContextValue {
  const value = useContext(SessionContext)
  if (value === null) throw new Error('useSession must be used inside <SessionProvider> (AppProviders adds it).')
  return value
}
