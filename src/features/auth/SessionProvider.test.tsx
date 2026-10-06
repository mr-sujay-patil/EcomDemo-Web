import { renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AppProviders, createQueryClient } from '@/app/providers'
import type { Role } from './session'
import { server } from '@/test/msw/server'
import { renderRoute, renderWithProviders, storeFor } from '@/test/render'
import { AccountMenu } from './AccountMenu'
import { useSession } from './useSession'

/** For `renderHook`: the providers, signed in as `role` or as nobody. */
function providersFor(role?: Role) {
  const client = createQueryClient()
  const store = storeFor(role)
  return function Providers({ children }: { children: ReactNode }) {
    return (
      <AppProviders client={client} session={store}>
        {children}
      </AppProviders>
    )
  }
}

async function signInAsking(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Username'), 'asha.rao')
  await user.type(screen.getByLabelText('Password'), 'correct horse')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('signing in, when the answers are not what the backend promised', () => {
  const generic = 'Something went wrong. Try again in a moment.'

  it.each([
    ['no body at all', () => new HttpResponse(null, { status: 200 })],
    ['a token with no access token in it', () => HttpResponse.json({ tokenType: 'Bearer', expiresIn: 900 })],
    ['a token that says neither when it ends', () => HttpResponse.json({ accessToken: 'tok' })],
  ])('stays signed out, with a plain sentence, for a login that answers with %s', async (_what, answer) => {
    const user = userEvent.setup()
    server.use(http.post('/api/auth/login', answer))
    const { store } = renderRoute('/sign-in')
    await screen.findByRole('heading', { level: 1, name: 'Sign in' })

    await signInAsking(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(generic)
    expect(store.getSnapshot().session).toBeNull()
  })

  it('stays signed out, with a plain sentence, when the profile answers with no body', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/auth/login', () => HttpResponse.json({ accessToken: 'tok', expiresIn: 900 })),
      http.get('/api/customers/me', () => new HttpResponse(null, { status: 200 })),
    )
    const { store } = renderRoute('/sign-in')
    await screen.findByRole('heading', { level: 1, name: 'Sign in' })

    await signInAsking(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(generic)
    expect(store.getSnapshot().session).toBeNull()
  })

  it('does not keep the token of a login whose profile could not be fetched', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/auth/login', () => HttpResponse.json({ accessToken: 'tok-orphan', expiresIn: 900 })),
      http.get('/api/customers/me', () => HttpResponse.json({ status: 503, message: 'Busy.' }, { status: 503 })),
    )
    const { store } = renderRoute('/sign-in')
    await screen.findByRole('heading', { level: 1, name: 'Sign in' })

    await signInAsking(user)
    await screen.findByRole('alert')

    expect(store.token()).toBeNull()
  })
})

describe('useSession', () => {
  it('says so, plainly, when it is used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => renderHook(() => useSession())).toThrow('useSession must be used inside <SessionProvider>')
  })

  it('reports nobody signed in, with no role', () => {
    const { result } = renderHook(() => useSession(), { wrapper: providersFor() })

    expect(result.current).toMatchObject({ session: null, profile: null, role: null, endedBy: null, expiring: false })
  })

  it('reports the profile and role of whoever is signed in', () => {
    const { result } = renderHook(() => useSession(), { wrapper: providersFor('ADMIN') })

    expect(result.current.role).toBe('ADMIN')
    expect(result.current.profile?.username).toBe('asha.rao')
  })
})

describe('the account menu with nobody signed in', () => {
  it('draws nothing', () => {
    const { container } = renderWithProviders(
      <MemoryRouter>
        <AccountMenu />
      </MemoryRouter>,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
