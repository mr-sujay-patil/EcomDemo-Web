import { QueryClient } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { createMemoryRouter, RouterProvider, type InitialEntry, type RouteObject } from 'react-router'
import { AppProviders, createQueryClient } from '@/app/providers'
import { routes } from '@/app/router'
import { createSessionStore, type Role, type Session, type SessionStore } from '@/features/auth/session'

/** A session as if someone had just signed in: valid for 15 minutes, as the backend issues them. */
export function sessionFor(role: Role = 'CUSTOMER', overrides: Partial<Session> = {}): Session {
  return {
    accessToken: 'test-token',
    expiresAt: Date.now() + 15 * 60_000,
    profile: { id: 1, username: 'asha.rao', fullName: 'Asha Rao', role, createdAt: '2026-10-06T10:00:00Z' },
    ...overrides,
  }
}

/** A session store that already holds a signed-in person (or nobody, without a role). */
export function storeFor(role?: Role): SessionStore {
  const store = createSessionStore()
  if (role) store.start(sessionFor(role))
  return store
}

type Options = { signedInAs?: Role; store?: SessionStore; client?: QueryClient }

// Every test renders through here, so when the app gains providers they are added once, in this wrapper. A page that links
// somewhere needs a router: render the whole app at a path with `renderRoute`. Each render gets its own query cache (one
// test's data never leaks into the next), which comes back as `client` for a test that wants to look inside it.
function wrapperFor(client: QueryClient, store: SessionStore) {
  return function Providers({ children }: { children: ReactNode }) {
    return (
      <AppProviders client={client} session={store}>
        {children}
      </AppProviders>
    )
  }
}

export function renderWithProviders(
  ui: ReactElement,
  {
    signedInAs,
    store = storeFor(signedInAs),
    client = createQueryClient(),
    ...options
  }: Options & Omit<RenderOptions, 'wrapper'> = {},
) {
  return { store, client, ...render(ui, { wrapper: wrapperFor(client, store), ...options }) }
}

/** Renders a route table (the app's, by default) as if the browser were at `path` (or at a location with router `state`), signed in as `signedInAs` or nobody. */
export function renderRoute(
  path: InitialEntry,
  { signedInAs, store = storeFor(signedInAs), client = createQueryClient() }: Options = {},
  table: RouteObject[] = routes,
) {
  const router = createMemoryRouter(table, { initialEntries: [path] })
  return {
    router,
    store,
    client,
    ...render(<RouterProvider router={router} />, { wrapper: wrapperFor(client, store) }),
  }
}
