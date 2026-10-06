import { render, type RenderOptions } from '@testing-library/react'
import { useState, type ReactElement, type ReactNode } from 'react'
import { createMemoryRouter, RouterProvider, type InitialEntry } from 'react-router'
import { AppProviders, createQueryClient } from '@/app/providers'
import { routes } from '@/app/router'

// Every test renders through here, so when the app gains providers (the session in Phase 11) they are added once, in this wrapper. A page that links
// somewhere needs a router: render the whole app at a path with `renderRoute`.
function Providers({ children }: { children: ReactNode }) {
  // A new cache per render: one test's data never leaks into the next.
  const [client] = useState(createQueryClient)
  return <AppProviders client={client}>{children}</AppProviders>
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: Providers, ...options })
}

/** Renders the real route table (layout included) as if the browser were at `path` (or at a location with router `state`). */
export function renderRoute(path: InitialEntry) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return { router, ...render(<RouterProvider router={router} />, { wrapper: Providers }) }
}
