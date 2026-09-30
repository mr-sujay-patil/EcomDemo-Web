import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'

// Every test renders through here, so when the app gains providers (the router in Phase 6, the
// query client in Phase 8, the session in Phase 11) they are added once, in this wrapper.
function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: Providers, ...options })
}
