import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'

// Every test renders through here, so when the app gains providers (the query client in
// Phase 8, the session in Phase 11) they are added once, in this wrapper. A page that links
// somewhere needs a router: render the whole app at a path with `renderRoute`.
function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: Providers, ...options })
}

/** Renders the real route table (layout included) as if the browser were at `path`. */
export function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return { router, ...render(<RouterProvider router={router} />) }
}
