import type { ReactNode } from 'react'

/** A paragraph the store owner has to write. It stays visible, and greppable, until they do. */
export function Todo({ children }: { children: ReactNode }) {
  return <p>TODO(owner): {children}</p>
}
