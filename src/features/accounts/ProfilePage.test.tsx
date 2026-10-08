import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/msw/server'
import { renderRoute, storeFor } from '@/test/render'

const me = { id: 1, username: 'asha.rao', fullName: 'Asha Rao', role: 'CUSTOMER', createdAt: '2026-03-04T10:00:00Z' }

describe('the profile page', () => {
  it('shows the username, the member-since date and the full name; says there is no password change', async () => {
    server.use(http.get('/api/customers/me', () => HttpResponse.json(me)))
    renderRoute('/account', { signedInAs: 'CUSTOMER' })

    expect(await screen.findByLabelText('Full name')).toHaveValue('Asha Rao')
    expect(screen.getByText('asha.rao')).toBeInTheDocument()
    expect(screen.getByText('4 March 2026')).toBeInTheDocument()
    expect(screen.getByText(/no way to change your password/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
  })

  it('saves the trimmed full name, confirms it, and the header follows', async () => {
    let sent: unknown
    server.use(
      http.get('/api/customers/me', () => HttpResponse.json(me)),
      http.put('/api/customers/me', async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ ...me, fullName: 'Meera Rao' })
      }),
    )
    const user = userEvent.setup()
    const store = storeFor('CUSTOMER')
    renderRoute('/account', { store })

    const field = await screen.findByLabelText('Full name')
    await user.clear(field)
    await user.type(field, '  Meera Rao  ')
    await user.click(screen.getByRole('button', { name: 'Save name' }))

    expect(await screen.findByText('Your name is updated.')).toBeInTheDocument()
    expect(sent).toEqual({ fullName: 'Meera Rao' })
    expect(store.getSnapshot().session?.profile.fullName).toBe('Meera Rao')
    expect(store.getSnapshot().session?.accessToken).toBe('test-token')
  })

  it('refuses a blank name before asking the server', async () => {
    let puts = 0
    server.use(
      http.get('/api/customers/me', () => HttpResponse.json(me)),
      http.put('/api/customers/me', () => {
        puts += 1
        return HttpResponse.json(me)
      }),
    )
    const user = userEvent.setup()
    renderRoute('/account', { signedInAs: 'CUSTOMER' })

    await user.clear(await screen.findByLabelText('Full name'))
    await user.click(screen.getByRole('button', { name: 'Save name' }))

    expect(await screen.findByText('Enter your name.')).toBeInTheDocument()
    expect(puts).toBe(0)
  })

  it('puts a server field error on the field and keeps the old name in the header', async () => {
    server.use(
      http.get('/api/customers/me', () => HttpResponse.json(me)),
      http.put('/api/customers/me', () =>
        HttpResponse.json({ status: 400, message: 'fullName must be at most 100 characters' }, { status: 400 }),
      ),
    )
    const user = userEvent.setup()
    const store = storeFor('CUSTOMER')
    renderRoute('/account', { store })

    const field = await screen.findByLabelText('Full name')
    await user.type(field, ' Junior')
    await user.click(screen.getByRole('button', { name: 'Save name' }))

    expect(await screen.findByText('Full name must be at most 100 characters')).toBeInTheDocument()
    expect(field).toHaveAccessibleDescription(/at most 100 characters/)
    expect(screen.queryByText('Your name is updated.')).not.toBeInTheDocument()
    expect(store.getSnapshot().session?.profile.fullName).toBe('Asha Rao')
  })

  it('shows a server failure above the form', async () => {
    server.use(
      http.get('/api/customers/me', () => HttpResponse.json(me)),
      http.put('/api/customers/me', () =>
        HttpResponse.json({ status: 500, message: 'Accounts are down' }, { status: 500 }),
      ),
    )
    const user = userEvent.setup()
    renderRoute('/account', { signedInAs: 'CUSTOMER' })

    await user.type(await screen.findByLabelText('Full name'), 'x')
    await user.click(screen.getByRole('button', { name: 'Save name' }))

    expect(await screen.findByText(/Accounts are down/)).toBeInTheDocument()
  })

  it('shows a load error with Retry', async () => {
    server.use(
      http.get('/api/customers/me', () =>
        HttpResponse.json({ status: 500, message: 'Accounts are down' }, { status: 500 }),
      ),
    )
    renderRoute('/account', { signedInAs: 'CUSTOMER' })

    expect(await screen.findByText(/Accounts are down/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry|try again/i })).toBeInTheDocument()
  })
})
