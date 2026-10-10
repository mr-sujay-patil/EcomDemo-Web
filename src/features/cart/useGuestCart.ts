import { useSyncExternalStore } from 'react'
import { useGuestCartContext } from './GuestCartProvider'

/** The guest cart's lines (kept in step with storage and other tabs), its changes, and the replay's report. */
export function useGuestCart() {
  const { store, replay, retry, dismiss } = useGuestCartContext()
  const lines = useSyncExternalStore(store.subscribe, store.getSnapshot)
  return {
    lines,
    add: store.add,
    setQuantity: store.setQuantity,
    remove: store.remove,
    replay,
    retry,
    dismiss,
  }
}
