import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSessionStore } from '@/features/auth/session'
import { server } from '@/test/msw/server'
import { renderRoute, sessionFor } from '@/test/render'
import { registeredUsername, signInStateFor } from './signInState'
import { formatWait } from './wait'

const profile = {
  id: 7,
  username: 'asha.rao',
  fullName: 'Asha Rao',
  role: 'CUSTOMER',
  createdAt: '2026-10-06T10:00:00Z',
}

/** The backend accepts the login and answers `/me`; records what it was sent. */
function loginWorks(role: 'CUSTOMER' | 'ADMIN' = 'CUSTOMER') {
  const seen = { login: [] as unknown[], meAuthorization: [] as (string | null)[] }
  server.use(
    http.post('/api/auth/login', async ({ request }) => {
      seen.login.push(await request.json())
      return HttpResponse.json({
        accessToken: 'a.b.c',
        tokenType: 'Bearer',
        expiresIn: 900,
        expiresAt: new Date(Date.now() + 900_000).toISOString(),
      })
    }),
    http.get('/api/customers/me', ({ request }) => {
      seen.meAuthorization.push(request.headers.get('Authorization'))
      return HttpResponse.json({ ...profile, role })
    }),
  )
  return seen
}

const loginFails = (status: number, body: object, headers: Record<string, string> = {}) =>
  server.use(http.post('/api/auth/login', () => HttpResponse.json(body, { status, headers })))

type User = ReturnType<typeof userEvent.setup>

async function fillIn(user: User, username = 'asha.rao', password = 'correct horse') {
  await user.type(screen.getByLabelText('Username'), username)
  await user.type(screen.getByLabelText('Password'), password)
}

const submit = (user: User) => user.click(screen.getByRole('button', { name: /^(Sign in|Try again)/ }))
const heading = (name: string) => screen.findByRole('heading', { level: 1, name })

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('the sign-in page', () => {
  it('is a form with a heading, two fields that a password manager can fill, and a way to create an account', async () => {
    renderRoute('/sign-in')

    expect(await heading('Sign in')).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/register')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('says how long signing in lasts, including that a reload signs out', async () => {
    renderRoute('/sign-in')

    expect(await screen.findByText(/until your session ends or you reload the page/)).toBeInTheDocument()
  })

  it('asks for both fields, focuses the first, and sends nothing, when they are empty', async () => {
    const user = userEvent.setup()
    let requests = 0
    server.use(
      http.post('/api/auth/login', () => {
        requests++
        return HttpResponse.json({})
      }),
    )
    renderRoute('/sign-in')
    await heading('Sign in')

    await submit(user)

    expect(await screen.findByText('Enter your username.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toHaveFocus()
    expect(requests).toBe(0)
  })

  it('arrives from registration with the username filled in, a note that the account is ready, and the cursor on the password', async () => {
    renderRoute({ pathname: '/sign-in', state: signInStateFor('asha.rao') })

    // The page's code is fetched when it is first visited: the loading note comes first, then the page.
    expect(await screen.findByText('Your account is ready. Sign in to start.')).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toHaveValue('asha.rao')
    expect(screen.getByLabelText('Password')).toHaveFocus()
  })

  describe('signing in', () => {
    it('sends the username and password as typed, asks who it is with the new token, and goes to the shelf', async () => {
      const user = userEvent.setup()
      const seen = loginWorks()
      const { router } = renderRoute('/sign-in')
      await heading('Sign in')

      await fillIn(user, 'asha.rao', '  spaced pass  ')
      await submit(user)

      expect(await heading('Everything for the desk')).toBeInTheDocument()
      expect(seen.login).toEqual([{ username: 'asha.rao', password: '  spaced pass  ' }])
      expect(seen.meAuthorization).toEqual(['Bearer a.b.c'])
      expect(router.state.location.pathname).toBe('/')
      expect(screen.getByRole('button', { name: 'Account: Asha' })).toBeInTheDocument()
    })

    it('returns to where the person was going, from ?next=', async () => {
      const user = userEvent.setup()
      loginWorks()
      const { router } = renderRoute('/sign-in?next=%2Forders%3Fpage%3D2')
      await heading('Sign in')

      await fillIn(user)
      await submit(user)

      expect(await heading('Your orders')).toBeInTheDocument()
      expect(router.state.location.pathname + router.state.location.search).toBe('/orders?page=2')
    })

    it.each(['//evil.example', '/\\evil.example', 'https://evil.example', 'orders', '/sign-in', '/register?x=1'])(
      'ignores ?next=%s: it is not a page of this site (or it would loop), so the shelf it is',
      async (next) => {
        const user = userEvent.setup()
        loginWorks()
        const { router } = renderRoute(`/sign-in?next=${encodeURIComponent(next)}`)
        await heading('Sign in')

        await fillIn(user)
        await submit(user)

        expect(await heading('Everything for the desk')).toBeInTheDocument()
        expect(router.state.location.pathname).toBe('/')
      },
    )

    it('keeps the token nowhere: not in storage, not in the address, not on the page, not in the console', async () => {
      const user = userEvent.setup()
      const consoleCalls = [
        vi.spyOn(console, 'log'),
        vi.spyOn(console, 'info'),
        vi.spyOn(console, 'warn'),
        vi.spyOn(console, 'error'),
      ]
      loginWorks()
      const { router, container } = renderRoute('/sign-in')
      await heading('Sign in')

      await fillIn(user)
      await submit(user)
      await heading('Everything for the desk')

      expect(localStorage.length).toBe(0)
      expect(sessionStorage.length).toBe(0)
      expect(document.cookie).toBe('')
      expect(router.state.location.search + router.state.location.hash).not.toContain('a.b.c')
      expect(container).not.toHaveTextContent('a.b.c')
      expect(JSON.stringify(consoleCalls.flatMap((spy) => spy.mock.calls))).not.toContain('a.b.c')
    })

    it('says "Wrong username or password." for a 401, keeps what was typed, and lets the person try again', async () => {
      const user = userEvent.setup()
      loginFails(401, { status: 401, message: 'Bad credentials' })
      renderRoute('/sign-in')
      await heading('Sign in')

      await fillIn(user)
      await submit(user)

      expect(await screen.findByRole('alert')).toHaveTextContent('Wrong username or password.')
      expect(screen.getByRole('alert')).not.toHaveTextContent('Bad credentials')
      expect(screen.getByLabelText('Username')).toHaveValue('asha.rao')
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
      expect(screen.queryByRole('button', { name: 'Account: Asha' })).not.toBeInTheDocument()
    })

    it('clears the old error when the person tries again, and signs in when it works', async () => {
      const user = userEvent.setup()
      loginFails(401, { status: 401, message: 'x' })
      renderRoute('/sign-in')
      await heading('Sign in')
      await fillIn(user)
      await submit(user)
      await screen.findByText('Wrong username or password.')

      loginWorks()
      await submit(user)

      expect(await heading('Everything for the desk')).toBeInTheDocument()
    })

    it('stays signed out, with the server’s words, when the profile cannot be fetched after a good login', async () => {
      const user = userEvent.setup()
      loginWorks()
      server.use(
        http.get('/api/customers/me', () =>
          HttpResponse.json({ status: 503, message: 'The accounts service is busy.' }, { status: 503 }),
        ),
      )
      renderRoute('/sign-in')
      await heading('Sign in')

      await fillIn(user)
      await submit(user)

      expect(await screen.findByRole('alert')).toHaveTextContent('The accounts service is busy.')
      expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument()
    })

    it('shows the message and a reference for support on a 500', async () => {
      const user = userEvent.setup()
      loginFails(
        500,
        { status: 500, message: 'Something went wrong on our side.' },
        { 'X-Correlation-Id': 'ref-for-support' },
      )
      renderRoute('/sign-in')
      await heading('Sign in')

      await fillIn(user)
      await submit(user)

      expect(within(await screen.findByRole('alert')).getByText('ref-for-support')).toBeInTheDocument()
    })

    it('says so when the server cannot be reached', async () => {
      const user = userEvent.setup()
      server.use(http.post('/api/auth/login', () => HttpResponse.error()))
      renderRoute('/sign-in')
      await heading('Sign in')

      await fillIn(user)
      await submit(user)

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server.')
    })

    it('sends one request however many times submit is pressed while it runs', async () => {
      const user = userEvent.setup()
      let release: () => void = () => undefined
      const gate = new Promise<void>((resolve) => {
        release = resolve
      })
      let requests = 0
      server.use(
        http.post('/api/auth/login', async () => {
          requests++
          await gate
          return HttpResponse.json({ accessToken: 'a.b.c', expiresIn: 900 })
        }),
        http.get('/api/customers/me', () => HttpResponse.json(profile)),
      )
      renderRoute('/sign-in')
      await heading('Sign in')
      await fillIn(user)

      await submit(user)
      await user.type(screen.getByLabelText('Password'), '{Enter}')

      expect(await screen.findByRole('button', { name: 'Sign in' })).toBeDisabled()
      release()
      await heading('Everything for the desk')
      expect(requests).toBe(1)
    })
  })

  describe('a throttled login (429)', () => {
    const throttled = (retryAfter?: string) => {
      let requests = 0
      server.use(
        http.post('/api/auth/login', () => {
          requests++
          return HttpResponse.json(
            { status: 429, message: 'Too many failed sign-ins.' },
            { status: 429, headers: retryAfter === undefined ? {} : { 'Retry-After': retryAfter } },
          )
        }),
      )
      return () => requests
    }

    // Only the clock is faked: the network (MSW) and the user's typing keep running on real timers.
    const fakeClock = () => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })

    it('shows the wait as a countdown on the button, disables it, and does not retry by itself', async () => {
      fakeClock()
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const requests = throttled('30')
      renderRoute('/sign-in')
      await heading('Sign in')
      await fillIn(user)

      await submit(user)

      expect(await screen.findByRole('alert')).toHaveTextContent('Too many sign-in attempts.')
      const button = screen.getByRole('button', { name: 'Try again in 30 s' })
      expect(button).toBeDisabled()

      act(() => {
        vi.advanceTimersByTime(10_000)
      })
      expect(screen.getByRole('button', { name: 'Try again in 20 s' })).toBeDisabled()
      // Enter in a field must not get round the disabled button.
      await user.type(screen.getByLabelText('Password'), '{Enter}')
      // ... nor may a submit that skips the button altogether.
      fireEvent.submit(screen.getByRole('form', { name: 'Sign in' }))
      expect(requests()).toBe(1)
    })

    it('enables the button when the wait is over, says so for a screen reader, and drops the error that was about the wait', async () => {
      fakeClock()
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const requests = throttled('3')
      renderRoute('/sign-in')
      await heading('Sign in')
      await fillIn(user)
      await submit(user)
      await screen.findByRole('alert')

      act(() => {
        vi.advanceTimersByTime(3_000)
      })

      expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent('You can try again now.')

      await submit(user)
      expect(await screen.findByRole('alert')).toBeInTheDocument()
      expect(requests()).toBe(2)
    })

    it('says minutes for a long wait', async () => {
      fakeClock()
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      throttled('125')
      renderRoute('/sign-in')
      await heading('Sign in')
      await fillIn(user)

      await submit(user)

      expect(await screen.findByRole('button', { name: 'Try again in 2 min 5 s' })).toBeDisabled()
    })

    it('reads a 429 without Retry-After as the gateway being busy: a moment, not a countdown of minutes', async () => {
      fakeClock()
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      throttled()
      renderRoute('/sign-in')
      await heading('Sign in')
      await fillIn(user)

      await submit(user)

      expect(await screen.findByRole('alert')).toHaveTextContent('The server is busy. Try again in a moment.')
      expect(screen.getByRole('button', { name: 'Try again in 1 s' })).toBeDisabled()
    })
  })

  describe('when a session has ended, or there is one already', () => {
    it.each([
      ['expired', /Your session ended, so we signed you out/],
      ['rejected', /no longer accepts your sign-in/],
    ] as const)('says why, after the session %s', async (reason, words) => {
      const store = createSessionStore()
      store.start(sessionFor())
      store.end(reason)

      renderRoute('/sign-in', { store })

      expect(await screen.findByText(words)).toBeInTheDocument()
    })

    it('says nothing about it after the person signed out themselves', async () => {
      const store = createSessionStore()
      store.start(sessionFor())
      store.end('signed-out')

      renderRoute('/sign-in', { store })
      await heading('Sign in')

      expect(screen.queryByText(/we signed you out/)).not.toBeInTheDocument()
    })

    it('sends someone who is already signed in on to where they were going', async () => {
      const { router } = renderRoute('/sign-in?next=%2Forders', { signedInAs: 'CUSTOMER' })

      expect(await heading('Your orders')).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/orders')
    })
  })
})

describe('signInState', () => {
  it('round-trips the username', () => {
    expect(registeredUsername(signInStateFor('asha.rao'))).toBe('asha.rao')
  })

  it.each([undefined, null, 'asha', 42, {}, { registered: 7 }, { registered: '' }])('ignores %j', (state) => {
    expect(registeredUsername(state)).toBeNull()
  })
})

describe('formatWait', () => {
  it.each([
    [0, '0 s'],
    [1, '1 s'],
    [28, '28 s'],
    [59, '59 s'],
    [60, '1 min'],
    [90, '1 min 30 s'],
    [125, '2 min 5 s'],
    [900, '15 min'],
    [0.2, '1 s'],
    [-5, '0 s'],
  ])('says %s seconds as "%s"', (seconds, words) => {
    expect(formatWait(seconds)).toBe(words)
  })
})
