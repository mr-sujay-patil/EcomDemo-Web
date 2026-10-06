import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'
import { registeredUsername, signInStateFor } from './signInState'

const token = { accessToken: 'a.b.c', tokenType: 'Bearer', expiresIn: 900 }

async function fillIn(user: ReturnType<typeof userEvent.setup>, username = 'asha.rao', password = 'correct horse') {
  await user.type(screen.getByLabelText('Username'), username)
  await user.type(screen.getByLabelText('Password'), password)
}

const submit = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'Sign in' }))

const loginFails = (status: number, body: object, headers: Record<string, string> = {}) =>
  server.use(http.post('/api/auth/login', () => HttpResponse.json(body, { status, headers })))

describe('the sign-in page', () => {
  it('is a form with a heading, two fields that a password manager can fill, and a way to create an account', async () => {
    renderRoute('/sign-in')

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/register')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('asks for both fields, focuses the first, and sends nothing, when they are empty', async () => {
    const user = userEvent.setup()
    let requests = 0
    server.use(
      http.post('/api/auth/login', () => {
        requests++
        return HttpResponse.json(token)
      }),
    )
    renderRoute('/sign-in')
    await screen.findByRole('heading', { level: 1, name: 'Sign in' })

    await submit(user)

    expect(await screen.findByText('Enter your username.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toHaveFocus()
    expect(requests).toBe(0)
  })

  it('arrives from registration with the username filled in, a note that the account is ready, and the cursor on the password', async () => {
    renderRoute({ pathname: '/sign-in', state: signInStateFor('asha.rao') })

    expect(await screen.findByRole('status')).toHaveTextContent('Your account is ready.')
    expect(screen.getByLabelText('Username')).toHaveValue('asha.rao')
    expect(screen.getByLabelText('Password')).toHaveFocus()
  })

  describe('signing in', () => {
    it('sends the username and password as typed, then says it worked and that sessions come later', async () => {
      const user = userEvent.setup()
      const bodies: unknown[] = []
      server.use(
        http.post('/api/auth/login', async ({ request }) => {
          bodies.push(await request.json())
          return HttpResponse.json(token)
        }),
      )
      renderRoute('/sign-in')
      await screen.findByRole('heading', { level: 1, name: 'Sign in' })

      await fillIn(user, 'asha.rao', '  spaced pass  ')
      await submit(user)

      expect(await screen.findByRole('status')).toHaveTextContent('Signed in. Sessions arrive in the next phase.')
      expect(bodies).toEqual([{ username: 'asha.rao', password: '  spaced pass  ' }])
      expect(screen.getByRole('link', { name: 'Back to the shelf' })).toHaveAttribute('href', '/')
      expect(screen.queryByRole('form')).not.toBeInTheDocument()
    })

    it('keeps the token nowhere: not in storage, not on the page', async () => {
      const user = userEvent.setup()
      server.use(http.post('/api/auth/login', () => HttpResponse.json(token)))
      const { container } = renderRoute('/sign-in')
      await screen.findByRole('heading', { level: 1, name: 'Sign in' })

      await fillIn(user)
      await submit(user)
      await screen.findByRole('status')

      expect(localStorage.length).toBe(0)
      expect(sessionStorage.length).toBe(0)
      expect(container).not.toHaveTextContent('a.b.c')
    })

    it('says "Wrong username or password." for a 401, keeps what was typed, and lets the person try again', async () => {
      const user = userEvent.setup()
      loginFails(401, { status: 401, message: 'Bad credentials' })
      renderRoute('/sign-in')
      await screen.findByRole('heading', { level: 1, name: 'Sign in' })

      await fillIn(user)
      await submit(user)

      expect(await screen.findByRole('alert')).toHaveTextContent('Wrong username or password.')
      expect(screen.getByRole('alert')).not.toHaveTextContent('Bad credentials')
      expect(screen.getByLabelText('Username')).toHaveValue('asha.rao')
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()

      server.use(http.post('/api/auth/login', () => HttpResponse.json(token)))
      await submit(user)
      expect(await screen.findByRole('status')).toHaveTextContent('Signed in.')
    })

    it('clears the old error when the person tries again', async () => {
      const user = userEvent.setup()
      let attempts = 0
      server.use(
        http.post('/api/auth/login', () => {
          attempts++
          return attempts === 1
            ? HttpResponse.json({ status: 401, message: 'x' }, { status: 401 })
            : HttpResponse.json({ status: 503, message: 'The sign-in service is busy.' }, { status: 503 })
        }),
      )
      renderRoute('/sign-in')
      await screen.findByRole('heading', { level: 1, name: 'Sign in' })
      await fillIn(user)
      await submit(user)
      await screen.findByText('Wrong username or password.')

      await submit(user)

      expect(await screen.findByText('The sign-in service is busy.')).toBeInTheDocument()
      expect(screen.queryByText('Wrong username or password.')).not.toBeInTheDocument()
    })

    it('shows what the server says for a throttled login (429), without retrying by itself', async () => {
      const user = userEvent.setup()
      let requests = 0
      server.use(
        http.post('/api/auth/login', () => {
          requests++
          return HttpResponse.json(
            { status: 429, message: 'Too many failed sign-ins. Try again later.' },
            { status: 429, headers: { 'Retry-After': '30' } },
          )
        }),
      )
      renderRoute('/sign-in')
      await screen.findByRole('heading', { level: 1, name: 'Sign in' })

      await fillIn(user)
      await submit(user)

      expect(await screen.findByRole('alert')).toHaveTextContent('Too many failed sign-ins. Try again later.')
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(requests).toBe(1)
    })

    it('shows the message and a reference for support on a 500', async () => {
      const user = userEvent.setup()
      loginFails(
        500,
        { status: 500, message: 'Something went wrong on our side.' },
        { 'X-Correlation-Id': 'ref-for-support' },
      )
      renderRoute('/sign-in')
      await screen.findByRole('heading', { level: 1, name: 'Sign in' })

      await fillIn(user)
      await submit(user)

      const alert = await screen.findByRole('alert')
      expect(within(alert).getByText('ref-for-support')).toBeInTheDocument()
    })

    it('says so when the server cannot be reached', async () => {
      const user = userEvent.setup()
      server.use(http.post('/api/auth/login', () => HttpResponse.error()))
      renderRoute('/sign-in')
      await screen.findByRole('heading', { level: 1, name: 'Sign in' })

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
          return HttpResponse.json(token)
        }),
      )
      renderRoute('/sign-in')
      await screen.findByRole('heading', { level: 1, name: 'Sign in' })
      await fillIn(user)

      await submit(user)
      await user.type(screen.getByLabelText('Password'), '{Enter}')

      expect(await screen.findByRole('button', { name: 'Sign in' })).toBeDisabled()
      release()
      await screen.findByRole('status')
      expect(requests).toBe(1)
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
