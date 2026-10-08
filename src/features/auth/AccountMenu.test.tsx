import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/render'

async function open(user: ReturnType<typeof userEvent.setup>, path = '/about') {
  const rendered = renderRoute(path, { signedInAs: 'CUSTOMER' })
  await screen.findByRole('heading', { level: 1 })
  const button = screen.getByRole('button', { name: 'Account: Asha' })
  await user.click(button)
  return { ...rendered, button }
}

describe('the account menu', () => {
  it('is a button with the first name, closed to begin with', async () => {
    renderRoute('/about', { signedInAs: 'CUSTOMER' })
    await screen.findByRole('heading', { level: 1, name: 'About' })

    const button = screen.getByRole('button', { name: 'Account: Asha' })

    expect(button).toHaveTextContent('Asha')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'My orders' })).not.toBeInTheDocument()
  })

  it('opens to My orders, Account and Sign out, and says it is open', async () => {
    const user = userEvent.setup()
    const { button } = await open(user)

    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveAttribute('aria-controls', screen.getByRole('list').id)
    expect(screen.getByRole('link', { name: 'My orders' })).toHaveAttribute('href', '/orders')
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/account')
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('closes when focus moves to something outside it, so it never covers where focus lands', async () => {
    const user = userEvent.setup()
    const { button } = await open(user)

    act(() => screen.getByRole('combobox', { name: 'Search products' }).focus())

    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'My orders' })).not.toBeInTheDocument()
  })

  it('stays open while focus moves between its own items', async () => {
    const user = userEvent.setup()
    const { button } = await open(user)

    await user.tab()
    expect(screen.getByRole('link', { name: 'My orders' })).toHaveFocus()
    await user.tab()

    expect(screen.getByRole('link', { name: 'Account' })).toHaveFocus()
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  it('closes when the button is pressed again', async () => {
    const user = userEvent.setup()
    const { button } = await open(user)

    await user.click(button)

    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'My orders' })).not.toBeInTheDocument()
  })

  it('closes on Escape and puts focus back on its button', async () => {
    const user = userEvent.setup()
    const { button } = await open(user)
    await user.tab()
    expect(screen.getByRole('link', { name: 'My orders' })).toHaveFocus()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('link', { name: 'My orders' })).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })

  it('closes on a click anywhere else, but not on a click inside it', async () => {
    const user = userEvent.setup()
    await open(user)

    await user.click(screen.getByRole('list'))
    expect(screen.getByRole('link', { name: 'My orders' })).toBeInTheDocument()

    await user.click(screen.getByRole('main'))
    expect(screen.queryByRole('link', { name: 'My orders' })).not.toBeInTheDocument()
  })

  it('takes the person to the page they chose, and closes', async () => {
    const user = userEvent.setup()
    const { router } = await open(user)

    await user.click(screen.getByRole('link', { name: 'My orders' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Your orders' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/orders')
    expect(screen.getByRole('button', { name: 'Account: Asha' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('signs out, goes to the shelf, and shows Sign in again', async () => {
    const user = userEvent.setup()
    const { router, store } = await open(user, '/account')

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Everything for the desk' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(store.getSnapshot()).toEqual({ session: null, endedBy: 'signed-out' })
    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Account: Asha' })).not.toBeInTheDocument()
  })

  it('names the header sign-in link itself, because its word is hidden in a narrow header', async () => {
    renderRoute('/about')
    await screen.findByRole('heading', { level: 1, name: 'About' })

    const link = within(screen.getByRole('banner')).getByRole('link', { name: 'Sign in' })

    // jsdom applies no CSS, so the name must come from the attribute, not from text a stylesheet can hide.
    expect(link).toHaveAttribute('aria-label', 'Sign in')
  })

  it('does not appear for someone who is signed out', async () => {
    renderRoute('/about')
    await screen.findByRole('heading', { level: 1, name: 'About' })

    expect(screen.queryByRole('button', { name: /^Account:/ })).not.toBeInTheDocument()
    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'Sign in' })).toBeInTheDocument()
  })
})
