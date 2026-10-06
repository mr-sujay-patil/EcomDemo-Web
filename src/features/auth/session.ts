import type { CustomerResponse } from './api'

// The session lives here and nowhere else: in this module's memory, never in localStorage,
// sessionStorage, a cookie or the URL. A reload therefore signs the person out; the sign-in page says so
// (docs/decisions.md, Phase 11). The token is never logged and never put in a component's state.

export type Role = CustomerResponse['role']

export type Session = {
  /** The bearer token. Only the API client's injection and this store ever read it. */
  accessToken: string
  /** When the server stops accepting the token, in ms since the epoch. There is no refresh (web KI-005). */
  expiresAt: number
  profile: CustomerResponse
}

/** Why the last session ended: the person signed out, the clock ran out, or the server refused the token. */
export type EndReason = 'signed-out' | 'expired' | 'rejected'

export type SessionSnapshot = { session: Session | null; endedBy: EndReason | null }

/** The warning comes this long before the session ends. */
export const WARN_BEFORE_MS = 60_000

/**
 * A tiny external store: React reads it with `useSyncExternalStore`, and the API client (which is not React)
 * reads the token from it. `getSnapshot` returns the same object until something changes.
 */
export function createSessionStore() {
  let snapshot: SessionSnapshot = { session: null, endedBy: null }
  const listeners = new Set<() => void>()

  function set(next: SessionSnapshot) {
    snapshot = next
    listeners.forEach((listener) => {
      listener()
    })
  }

  /** Ends the session. Returns whether there was one to end. */
  function end(reason: EndReason) {
    if (snapshot.session === null) return false
    set({ session: null, endedBy: reason })
    return true
  }

  // Arrow functions, no `this`: they are handed to the API client and to React as callbacks.
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    /** What the API client sends: the token, or null when nobody is signed in. */
    token: () => snapshot.session?.accessToken ?? null,
    start: (session: Session) => {
      set({ session, endedBy: null })
    },
    end,
    /** The server said 401 to this token: ends the session only if it is still the one in use. */
    reject: (rejectedToken: string) => {
      if (snapshot.session?.accessToken === rejectedToken) end('rejected')
    },
  }
}

export type SessionStore = ReturnType<typeof createSessionStore>

/** First word of the full name, for the header: "Asha Rao" is "Asha". */
export function firstName(profile: CustomerResponse): string {
  const name = (profile.fullName ?? '').trim().split(/\s+/)[0]
  return name || profile.username || 'Account'
}

/** The moment the server stops accepting a token, from the login answer. `null` when it says neither. */
export function expiryOf(token: { expiresAt?: string; expiresIn?: number }, now: number): number | null {
  const at = token.expiresAt === undefined ? Number.NaN : Date.parse(token.expiresAt)
  if (!Number.isNaN(at)) return at
  return token.expiresIn === undefined ? null : now + token.expiresIn * 1000
}
