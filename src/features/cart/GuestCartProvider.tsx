import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { catalogKeys } from '@/features/catalog/api'
import type { ProductResponse } from '@/features/catalog/products'
import { useSessionContext } from '@/features/auth/SessionProvider'
import { useSession } from '@/features/auth/useSession'
import { cartKeys, useAddToCart } from './api'
import { fetchCart } from './cart'
import { createGuestCartStore, type GuestCartStore } from './guestCartStore'
import { replayGuestCart, withReplayLock, type ReplayOutcome } from './guestReplay'

/** Where the replay is: not running, running, or finished with something to tell the person. */
export type ReplayState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; outcome: ReplayOutcome; names: ReadonlyMap<number, string> }

const IDLE: ReplayState = { status: 'idle' }

type GuestCartContextValue = {
  store: GuestCartStore
  replay: ReplayState
  /** Sends what is still in the browser again (after a failed send). */
  retry: () => void
  /** Puts the report away. */
  dismiss: () => void
}

const GuestCartContext = createContext<GuestCartContextValue | null>(null)

/** A product's name, if the catalogue cache has it (the browser never stores names): for the report only. */
function cachedName(queryClient: QueryClient, productId: number): string | undefined {
  return (
    queryClient.getQueryData<ProductResponse>(catalogKeys.detail(productId))?.name ??
    queryClient.getQueryData<ProductResponse[]>(catalogKeys.list())?.find((product) => product.id === productId)?.name
  )
}

/**
 * Owns the guest cart for the app and replays it into the account's cart when a customer signs in (decisions [Phase 24]):
 * once per session (per token), holding the replay lock, reading the account's cart first (so a send whose answer was lost
 * is not repeated, web KI-037), through the cart's own mutation queue, and then reads the server cart again. An admin's sign-in replays nothing. When the session ends the report goes too. Must sit inside the
 * `SessionProvider` (it needs the session and the query cache).
 */
export function GuestCartProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createGuestCartStore)
  const { store: sessions } = useSessionContext()
  const { session, role } = useSession()
  const queryClient = useQueryClient()
  const { mutateAsync: addToCart } = useAddToCart()
  // The report is kept with the token of the session it belongs to: a later session (or none) does not see it.
  const [replay, setReplay] = useState<{ token: string | null; state: ReplayState }>({ token: null, state: IDLE })
  const replayedFor = useRef<string | null>(null)
  const token = session?.accessToken ?? null

  const run = useCallback(
    async (forToken: string) => {
      if (store.refresh().length === 0) return
      const stillSignedIn = () => sessions.token() === forToken
      const names = new Map(
        store.getSnapshot().map((line) => [line.productId, cachedName(queryClient, line.productId)]),
      )
      setReplay({ token: forToken, state: { status: 'running' } })
      let outcome: ReplayOutcome
      try {
        outcome = await withReplayLock(() =>
          replayGuestCart({
            store,
            readCart: () => fetchCart(),
            send: ({ productId, quantity }) => addToCart({ productId, quantity }),
            stillSignedIn,
          }),
        )
      } catch {
        // The lock itself failed (the browser refused it): nothing was sent, everything is still in the browser.
        outcome = { moved: [], dropped: [], kept: store.getSnapshot() }
      }
      if (!stillSignedIn()) return
      // Each answer was the whole cart, but a read that started before the first one may land after it: ask once more.
      if (outcome.moved.length > 0) void queryClient.invalidateQueries({ queryKey: cartKeys.all })
      const nothingToSay = outcome.moved.length + outcome.dropped.length + outcome.kept.length === 0
      const known = new Map([...names].filter((entry): entry is [number, string] => entry[1] !== undefined))
      setReplay({ token: forToken, state: nothingToSay ? IDLE : { status: 'done', outcome, names: known } })
    },
    [store, sessions, queryClient, addToCart],
  )

  useEffect(() => {
    if (token === null || role !== 'CUSTOMER' || replayedFor.current === token) return
    replayedFor.current = token
    void run(token)
  }, [token, role, run])

  const shown = token !== null && replay.token === token ? replay.state : IDLE

  const retry = useCallback(() => {
    if (token !== null && role === 'CUSTOMER') void run(token)
  }, [token, role, run])
  const dismiss = useCallback(() => setReplay({ token: null, state: IDLE }), [])

  const value = useMemo(() => ({ store, replay: shown, retry, dismiss }), [store, shown, retry, dismiss])
  return <GuestCartContext.Provider value={value}>{children}</GuestCartContext.Provider>
}

export function useGuestCartContext(): GuestCartContextValue {
  const value = useContext(GuestCartContext)
  if (value === null) throw new Error('useGuestCart must be used inside <GuestCartProvider> (AppProviders adds it).')
  return value
}
