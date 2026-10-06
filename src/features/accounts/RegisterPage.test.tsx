import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'

const account = {
  id: 7,
  username: 'asha.rao',
  fullName: 'Asha Rao',
  role: 'CUSTOMER',
  createdAt: '2026-10-06T10:00:00Z',
}

/** Answers registration and records what was sent. */
function registrationAccepts() {
  const bodies: unknown[] = []
  server.use(
    http.post('/api/customers/register', async ({ request }) => {
      bodies.push(await request.json())
      return HttpResponse.json(account, { status: 201 })
    }),
  )
  return bodies
}

async function fillIn(
  user: ReturnType<typeof userEvent.setup>,
  values = { username: 'asha.rao', password: 'correct horse', fullName: '  Asha Rao ' },
) {
  await user.type(screen.getByLabelText('Username'), values.username)
  await user.type(screen.getByLabelText('Password'), values.password)
  await user.type(screen.getByLabelText('Full name'), values.fullName)
}

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Create account' }))

describe('the register page', () => {
  it('is a form with a heading, three labelled fields with hints, and a way to sign in instead', async () => {
    renderRoute('/register')

    expect(await screen.findByRole('heading', { level: 1, name: 'Create an account' })).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'Create an account' })).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toHaveAccessibleDescription(/3 to 50 characters/)
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText('Full name')).toHaveAttribute('autocomplete', 'name')
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in')
  })

  describe('validation in the browser', () => {
    it('stops an empty form, says what to do on every field, focuses the first, and sends nothing', async () => {
      const user = userEvent.setup()
      const bodies = registrationAccepts()
      renderRoute('/register')
      await screen.findByRole('heading', { level: 1, name: 'Create an account' })

      await submit(user)

      expect(await screen.findByText('Choose a username.')).toBeInTheDocument()
      expect(screen.getByText('Choose a password.')).toBeInTheDocument()
      expect(screen.getByText('Enter your name.')).toBeInTheDocument()
      expect(screen.getByLabelText('Username')).toHaveFocus()
      expect(screen.getByLabelText('Username')).toBeInvalid()
      expect(bodies).toEqual([])
    })

    it('says a short password is short, after the person leaves the field, and stops saying it once fixed', async () => {
      const user = userEvent.setup()
      renderRoute('/register')
      await screen.findByRole('heading', { level: 1, name: 'Create an account' })
      const password = screen.getByLabelText('Password')

      await user.type(password, 'short')
      expect(screen.queryByText('Use at least 8 characters.')).not.toBeInTheDocument()
      await user.tab()
      expect(await screen.findByText('Use at least 8 characters.')).toBeInTheDocument()

      await user.type(password, ' enough')
      await waitFor(() => {
        expect(screen.queryByText('Use at least 8 characters.')).not.toBeInTheDocument()
      })
    })

    it('shows and hides the password on request', async () => {
      const user = userEvent.setup()
      renderRoute('/register')
      await screen.findByRole('heading', { level: 1, name: 'Create an account' })

      await user.type(screen.getByLabelText('Password'), 'correct horse')
      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
      await user.click(screen.getByRole('button', { name: 'Show password' }))

      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
      expect(screen.getByLabelText('Password')).toHaveValue('correct horse')
      expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument()
    })
  })

  describe('a successful registration', () => {
    it('sends the trimmed name, then goes to sign-in with the username filled in and a note that the account is ready', async () => {
      const user = userEvent.setup()
      const bodies = registrationAccepts()
      const { router } = renderRoute('/register')
      await screen.findByRole('heading', { level: 1, name: 'Create an account' })

      await fillIn(user)
      await submit(user)

      expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
      expect(bodies).toEqual([{ username: 'asha.rao', password: 'correct horse', fullName: 'Asha Rao' }])
      expect(router.state.location.pathname).toBe('/sign-in')
      expect(screen.getByLabelText('Username')).toHaveValue('asha.rao')
      expect(screen.getByLabelText('Password')).toHaveValue('')
      expect(screen.getByRole('status')).toHaveTextContent('Your account is ready.')
      expect(screen.getByLabelText('Password')).toHaveFocus()
    })

    it('does not sign the person in: no token is kept anywhere', async () => {
      const user = userEvent.setup()
      registrationAccepts()
      renderRoute('/register')
      await screen.findByRole('heading', { level: 1, name: 'Create an account' })

      await fillIn(user)
      await submit(user)
      await screen.findByRole('heading', { level: 1, name: 'Sign in' })

      expect(localStorage.length).toBe(0)
      expect(sessionStorage.length).toBe(0)
    })
  })

  describe('when the backend says no', () => {
    it('puts "username taken" (409) on the username field, with focus, and stays on the page', async () => {
      const user = userEvent.setup()
      server.use(
        http.post('/api/customers/register', () =>
          HttpResponse.json({ status: 409, message: "Username 'asha.rao' is already taken" }, { status: 409 }),
        ),
      )
      const { router } = renderRoute('/register')
      await screen.findByRole('heading', { level: 1, name: 'Create an account' })

      await fillIn(user)
      await submit(user)

      expect(await screen.findByText("Username 'asha.rao' is already taken")).toBeInTheDocument()
      expect(screen.getByLabelText('Username')).toBeInvalid()
      expect(screen.getByLabelText('Username')).toHaveFocus()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/register')
    })

    it('puts every field a 400 rejects on that field, even when the browser let it through', async () => {
      const user = userEvent.setup()
      server.use(
        http.post('/api/customers/register', () =>
          HttpResponse.json(
            {
              status: 400,
              message:
                'fullName must not be blank; password must be between 8 and 72 characters; username may contain only letters, digits, dots, underscores and hyphens',
            },
            { status: 400 },
          ),
        ),
      )
      renderRoute('/register')
      await screen.findByRole('heading', { level: 1, name: 'Create an account' })

      await fillIn(user)
      await submit(user)

      expect(await screen.findByText('Full name must not be blank')).toBeInTheDocument()
      expect(screen.getByLabelText('Full name')).toHaveAccessibleDescription('Full name must not be blank')
      expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
        'Password must be between 8 and 72 characters',
      )
      expect(screen.getByLabelText('Username')).toHaveAccessibleDescription(/^Username may contain only letters/)
      expect(screen.getByLabelText('Username')).toHaveFocus()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('shows a 400 part that names no field above the form', async () => {
      const user = userEvent.setup()
      server.use(
        http.post('/api/customers/register', () =>
          HttpResponse.json({ status: 400, message: 'The request body is malformed' }, { status: 400 }),
        ),
      )
      renderRoute('/register')
      await screen.findByRole('heading', { level: 1, name: 'Create an account' })

      await fillIn(user)
      await submit(user)

      expect(await screen.findByRole('alert')).toHaveTextContent('The request body is malformed')
    })

    it('shows the server’s message and a reference for support on a 500, and does not send the request again by itself', async () => {
      const user = userEvent.setup()
      let requests = 0
      server.use(
        http.post('/api/customers/register', () => {
          requests++
          return HttpResponse.json(
            { status: 500, message: 'Something went wrong on our side.' },
            { status: 500, headers: { 'X-Correlation-Id': 'ref-for-support' } },
          )
        }),
      )
      renderRoute('/register')
      await screen.findByRole('heading', { level: 1, name: 'Create an account' })

      await fillIn(user)
      await submit(user)

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Something went wrong on our side.')
      expect(within(alert).getByText('ref-for-support')).toBeInTheDocument()
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(requests).toBe(1)
    })

    it('says so when the server cannot be reached, and lets the person try again', async () => {
      const user = userEvent.setup()
      let up = false
      server.use(
        http.post('/api/customers/register', () =>
          up ? HttpResponse.json(account, { status: 201 }) : HttpResponse.error(),
        ),
      )
      renderRoute('/register')
      await screen.findByRole('heading', { level: 1, name: 'Create an account' })
      await fillIn(user)
      await submit(user)

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server.')
      up = true
      await submit(user)

      expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    })
  })

  it('shows a spinner while the request runs, and sends it once however many times submit is pressed', async () => {
    const user = userEvent.setup()
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let requests = 0
    server.use(
      http.post('/api/customers/register', async () => {
        requests++
        await gate
        return HttpResponse.json(account, { status: 201 })
      }),
    )
    renderRoute('/register')
    await screen.findByRole('heading', { level: 1, name: 'Create an account' })
    await fillIn(user)

    await submit(user)
    await user.type(screen.getByLabelText('Full name'), '{Enter}')
    await user.keyboard('{Enter}')

    const button = await screen.findByRole('button', { name: 'Create account' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    release()
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    expect(requests).toBe(1)
  })
})
