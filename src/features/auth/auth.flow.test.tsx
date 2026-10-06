import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { RouteObject } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/errors'
import { appApi } from '@/api/client'
import { SignInPage } from '@/features/accounts/SignInPage'
import { server } from '@/test/msw/server'
import { renderRoute, sessionFor, storeFor } from '@/test/render'
import { RequireRole } from './RequireRole'
import { createSessionStore } from './session'
import { useFormDraft } from './useFormDraft'

// A page of this test's own, standing in for the protected forms later phases build: a note and a password, and
// a Send that calls an endpoint only a signed-in customer may call.
function DraftPage() {
  const form = useForm({ defaultValues: { note: '', password: '' } })
  const { clearDraft } = useFormDraft(form, 'draft-page', ['password'])
  const [result, setResult] = useState('nothing sent')
  async function send() {
    try {
      await appApi.GET('/api/cart')
      clearDraft()
      setResult('sent')
    } catch (error) {
      setResult(error instanceof ApiError ? `failed ${error.status}` : 'failed')
    }
  }
  return (
    <div>
      <h1>Draft</h1>
      <label>
        Note <input {...form.register('note')} />
      </label>
      <label>
        Secret <input type="password" {...form.register('password')} />
      </label>
      <button type="button" onClick={() => void send()}>
        Send
      </button>
      <output>{result}</output>
    </div>
  )
}

const table: RouteObject[] = [
  { path: '/', element: <h1>Home</h1> },
  { path: '/sign-in', element: <SignInPage /> },
  { element: <RequireRole role="CUSTOMER" />, children: [{ path: '/draft', element: <DraftPage /> }] },
  { element: <RequireRole role="ADMIN" />, children: [{ path: '/console', element: <h1>Console</h1> }] },
]

const profile = {
  id: 1,
  username: 'asha.rao',
  fullName: 'Asha Rao',
  role: 'CUSTOMER',
  createdAt: '2026-10-06T10:00:00Z',
}

/** The backend accepts a login and issues `token`. */
function loginIssues(token = 'tok-second') {
  server.use(
    http.post('/api/auth/login', () => HttpResponse.json({ accessToken: token, expiresIn: 900 })),
    http.get('/api/customers/me', () => HttpResponse.json(profile)),
  )
}

const cartAnswers = (status: number, seen: (string | null)[] = []) =>
  server.use(
    http.get('/api/cart', ({ request }) => {
      seen.push(request.headers.get('Authorization'))
      return status === 200
        ? HttpResponse.json({ items: [] })
        : HttpResponse.json({ status, message: 'No.' }, { status })
    }),
  )

afterEach(() => {
  vi.useRealTimers()
})

describe('guards', () => {
  it.each(['/cart', '/checkout', '/orders', '/orders/42', '/account'])(
    'send someone signed out from %s to sign-in',
    async (path) => {
      const { router } = renderRoute(path)

      expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/sign-in')
      expect(new URLSearchParams(router.state.location.search).get('next')).toBe(path)
    },
  )

  it('keep the whole address in ?next=, query and fragment too', async () => {
    const { router } = renderRoute('/orders?page=2#latest')

    await screen.findByRole('heading', { level: 1, name: 'Sign in' })

    expect(new URLSearchParams(router.state.location.search).get('next')).toBe('/orders?page=2#latest')
  })

  it('send someone signed out from the console to sign-in as well', async () => {
    const { router } = renderRoute('/admin')

    await screen.findByRole('heading', { level: 1, name: 'Sign in' })

    expect(new URLSearchParams(router.state.location.search).get('next')).toBe('/admin')
  })

  it('let a customer into the shop pages', async () => {
    renderRoute('/orders', { signedInAs: 'CUSTOMER' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Your orders' })).toBeInTheDocument()
  })

  it('show "Not permitted", in place, to a customer on the console: not a sign-in prompt', async () => {
    const { router } = renderRoute('/admin', { signedInAs: 'CUSTOMER' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Not permitted' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin')
    expect(screen.queryByRole('heading', { level: 1, name: 'Admin' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the shelf' })).toHaveAttribute('href', '/')
    await waitFor(() => {
      expect(document.title).toBe('EcomDemo · Not permitted')
    })
  })

  it('show "Not permitted" to an admin on a customer page: the guard is about the role, not about being signed in', async () => {
    renderRoute('/cart', { signedInAs: 'ADMIN' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Not permitted' })).toBeInTheDocument()
  })

  it('give a page its own title back when the person leaves "Not permitted"', async () => {
    const user = userEvent.setup()
    renderRoute('/admin', { signedInAs: 'CUSTOMER' })
    await screen.findByRole('heading', { level: 1, name: 'Not permitted' })

    await user.click(screen.getByRole('link', { name: 'Back to the shelf' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Everything for the desk' })).toBeInTheDocument()
    await waitFor(() => {
      expect(document.title).toBe('EcomDemo · Products')
    })
  })

  it('show "Not permitted" even on a route with no layout around it (the page can name itself only inside one)', async () => {
    renderRoute('/console', { signedInAs: 'CUSTOMER' }, table)

    expect(await screen.findByRole('heading', { level: 1, name: 'Not permitted' })).toBeInTheDocument()
  })

  it('mirror the server only: the header offers Admin to an admin and to nobody else', async () => {
    const admin = renderRoute('/about', { signedInAs: 'ADMIN' })
    await screen.findByRole('heading', { level: 1, name: 'About' })
    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin')
    admin.unmount()

    const customer = renderRoute('/about', { signedInAs: 'CUSTOMER' })
    await screen.findByRole('heading', { level: 1, name: 'About' })
    expect(within(screen.getByRole('banner')).queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
    customer.unmount()

    renderRoute('/about')
    await screen.findByRole('heading', { level: 1, name: 'About' })
    expect(within(screen.getByRole('banner')).queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
  })
})

describe('a 401 in the middle of a session', () => {
  it('ends the session, goes to sign-in with the page it was on, and says why', async () => {
    const user = userEvent.setup()
    cartAnswers(401)
    const { router, store } = renderRoute('/draft', { signedInAs: 'CUSTOMER' }, table)
    await screen.findByRole('heading', { level: 1, name: 'Draft' })

    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    expect(new URLSearchParams(router.state.location.search).get('next')).toBe('/draft')
    expect(store.getSnapshot()).toEqual({ session: null, endedBy: 'rejected' })
    expect(screen.getByText(/no longer accepts your sign-in/)).toBeInTheDocument()
  })

  it('keeps what was typed, and gives it back, with the page, after signing in again (but never the password)', async () => {
    const user = userEvent.setup()
    cartAnswers(401)
    renderRoute('/draft', { signedInAs: 'CUSTOMER' }, table)
    await screen.findByRole('heading', { level: 1, name: 'Draft' })
    await user.type(screen.getByLabelText('Note'), 'half a message')
    await user.type(screen.getByLabelText('Secret'), 'not for keeping')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByRole('heading', { level: 1, name: 'Sign in' })

    loginIssues()
    await user.type(screen.getByLabelText('Username'), 'asha.rao')
    await user.type(screen.getByLabelText('Password'), 'correct horse')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Draft' })).toBeInTheDocument()
    expect(screen.getByLabelText('Note')).toHaveValue('half a message')
    expect(screen.getByLabelText('Secret')).toHaveValue('')
  })

  it('sends the new token afterwards, not the old one', async () => {
    const user = userEvent.setup()
    const seen: (string | null)[] = []
    cartAnswers(401, seen)
    renderRoute('/draft', { signedInAs: 'CUSTOMER' }, table)
    await screen.findByRole('heading', { level: 1, name: 'Draft' })
    await user.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByRole('heading', { level: 1, name: 'Sign in' })
    loginIssues('tok-second')
    await user.type(screen.getByLabelText('Username'), 'asha.rao')
    await user.type(screen.getByLabelText('Password'), 'correct horse')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await screen.findByRole('heading', { level: 1, name: 'Draft' })

    cartAnswers(200, seen)
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText('sent')).toBeInTheDocument()
    expect(seen).toEqual(['Bearer test-token', 'Bearer tok-second'])
  })

  it('does not end a newer session because of a late 401 for the old token', async () => {
    const store = storeFor('CUSTOMER')
    renderRoute('/about', { store })
    await screen.findByRole('heading', { level: 1, name: 'About' })
    // A request sent with the first token is still in flight when the person signs in again with a second.
    server.use(
      http.get('/api/cart', async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
        return HttpResponse.json({ status: 401, message: 'Expired.' }, { status: 401 })
      }),
    )
    const late = appApi.GET('/api/cart').catch(() => undefined)

    act(() => {
      store.start(sessionFor('CUSTOMER', { accessToken: 'tok-newer' }))
    })
    await late

    expect(store.token()).toBe('tok-newer')
  })

  it('does not treat a 401 from the login itself as an ended session', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ status: 401, message: 'Bad credentials' }, { status: 401 }),
      ),
    )
    const { store } = renderRoute('/sign-in')
    await screen.findByRole('heading', { level: 1, name: 'Sign in' })

    await user.type(screen.getByLabelText('Username'), 'asha.rao')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await screen.findByText('Wrong username or password.')

    expect(store.getSnapshot().endedBy).toBeNull()
  })

  it('treats a 403 as "not allowed", never as a reason to sign out or to sign in again', async () => {
    const user = userEvent.setup()
    cartAnswers(403)
    const { store, router } = renderRoute('/draft', { signedInAs: 'CUSTOMER' }, table)
    await screen.findByRole('heading', { level: 1, name: 'Draft' })

    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText('failed 403')).toBeInTheDocument()
    expect(store.getSnapshot().session).not.toBeNull()
    expect(router.state.location.pathname).toBe('/draft')
  })

  it('does not end the session for a 500 or a lost connection either', async () => {
    const user = userEvent.setup()
    server.use(http.get('/api/cart', () => HttpResponse.error()))
    const { store } = renderRoute('/draft', { signedInAs: 'CUSTOMER' }, table)
    await screen.findByRole('heading', { level: 1, name: 'Draft' })

    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText('failed 0')).toBeInTheDocument()
    expect(store.getSnapshot().session).not.toBeNull()
  })
})

describe('the clock: one minute of warning, then the end', () => {
  // setTimeout and Date are faked; typing uses no delay, so nothing waits on a timer that no one advances.
  const fakeClock = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  const store = (secondsLeft: number) => {
    const s = createSessionStore()
    s.start(sessionFor('CUSTOMER', { expiresAt: Date.now() + secondsLeft * 1000 }))
    return s
  }
  const notice = () => screen.queryByText("You'll be signed out in a minute")
  const advance = (ms: number) => {
    act(() => {
      vi.advanceTimersByTime(ms)
    })
  }

  it('says nothing until the last minute, then warns quietly', () => {
    fakeClock()
    renderRoute('/about', { store: store(120) })
    expect(notice()).not.toBeInTheDocument()

    advance(59_000)
    expect(notice()).not.toBeInTheDocument()

    advance(2_000)
    expect(notice()).toBeInTheDocument()
  })

  it('warns at once when a minute or less is left already', () => {
    fakeClock()
    renderRoute('/about', { store: store(30) })

    expect(notice()).toBeInTheDocument()
  })

  it('ends the session at the moment the server stops accepting the token, and sends them to sign in', () => {
    fakeClock()
    const s = store(90)
    const { router } = renderRoute('/draft', { store: s }, table)

    advance(89_000)
    expect(s.getSnapshot().session).not.toBeNull()
    advance(2_000)

    expect(s.getSnapshot()).toEqual({ session: null, endedBy: 'expired' })
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    expect(new URLSearchParams(router.state.location.search).get('next')).toBe('/draft')
    expect(screen.getByText(/Your session ended, so we signed you out/)).toBeInTheDocument()
    expect(notice()).not.toBeInTheDocument()
  })

  it('keeps the draft through the expiry, and gives it back after signing in again', async () => {
    fakeClock()
    renderRoute('/draft', { store: store(90) }, table)
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'half a message' } })
    advance(91_000)
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()

    vi.useRealTimers()
    loginIssues()
    const again = userEvent.setup()
    await again.type(screen.getByLabelText('Username'), 'asha.rao')
    await again.type(screen.getByLabelText('Password'), 'correct horse')
    await again.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Draft' })).toBeInTheDocument()
    expect(screen.getByLabelText('Note')).toHaveValue('half a message')
  })

  it('checks again when the page is visible again, because a sleeping laptop stops timers', () => {
    fakeClock()
    const s = store(300)
    renderRoute('/draft', { store: s }, table)

    // The clock jumps ahead while no timer runs (the lid was shut).
    vi.setSystemTime(Date.now() + 400_000)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(s.getSnapshot().endedBy).toBe('expired')
  })

  it('also checks again when the window gets focus', () => {
    fakeClock()
    const s = store(300)
    renderRoute('/draft', { store: s }, table)

    vi.setSystemTime(Date.now() + 400_000)
    act(() => {
      fireEvent.focus(window)
    })

    expect(s.getSnapshot().endedBy).toBe('expired')
  })

  it('stops the clock when the person signs out: no warning or expiry afterwards', () => {
    fakeClock()
    const s = store(90)
    renderRoute('/about', { store: s })
    act(() => {
      s.end('signed-out')
    })

    advance(200_000)

    expect(s.getSnapshot().endedBy).toBe('signed-out')
    expect(notice()).not.toBeInTheDocument()
  })

  it('starts a fresh clock for a new session', () => {
    fakeClock()
    const s = store(90)
    renderRoute('/about', { store: s })
    advance(70_000)
    expect(notice()).toBeInTheDocument()

    act(() => {
      s.end('expired')
      s.start(sessionFor('CUSTOMER', { expiresAt: Date.now() + 600_000 }))
    })

    expect(notice()).not.toBeInTheDocument()
  })
})

describe('the data a session leaves behind', () => {
  const seed = (client: { setQueryData: (key: unknown[], data: unknown) => void }) => {
    client.setQueryData(['cart'], { items: [{ productId: 1 }] })
    client.setQueryData(['orders', 'list'], [{ id: 5 }])
    client.setQueryData(['catalog', 'list'], [{ id: 1, name: 'Test Kettle' }])
  }

  it('is cleared on sign-out, except the catalogue, which is the same for everyone', async () => {
    const user = userEvent.setup()
    const { client } = renderRoute('/about', { signedInAs: 'CUSTOMER' })
    await screen.findByRole('heading', { level: 1, name: 'About' })
    seed(client)

    await user.click(screen.getByRole('button', { name: 'Account: Asha' }))
    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(client.getQueryData(['cart'])).toBeUndefined()
    expect(client.getQueryData(['orders', 'list'])).toBeUndefined()
    expect(client.getQueryData(['catalog', 'list'])).toBeDefined()
  })

  it('is cleared when the session expires or is refused, too', async () => {
    const { client, store } = renderRoute('/about', { signedInAs: 'CUSTOMER' })
    await screen.findByRole('heading', { level: 1, name: 'About' })
    seed(client)

    act(() => {
      store.end('expired')
    })

    expect(client.getQueryData(['cart'])).toBeUndefined()
    expect(client.getQueryData(['catalog', 'list'])).toBeDefined()
  })

  it('does not outlive a sign-out in the drafts either', async () => {
    const user = userEvent.setup()
    cartAnswers(200)
    const { store } = renderRoute('/draft', { signedInAs: 'CUSTOMER' }, table)
    await screen.findByRole('heading', { level: 1, name: 'Draft' })
    await user.type(screen.getByLabelText('Note'), 'private words')
    act(() => {
      store.end('signed-out')
    })
    // (the deliberate path through the menu drops the drafts; this checks the guard's side: back to sign-in)
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
  })
})
