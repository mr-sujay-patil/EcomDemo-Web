import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Header } from './Header'

describe('Header', () => {
  it('is the page banner with the logo, a search, and the primary navigation', () => {
    render(<Header />)

    const banner = screen.getByRole('banner')
    expect(within(banner).getByRole('img', { name: 'EcomDemo' })).toBeInTheDocument()
    expect(within(banner).getByRole('search')).toBeInTheDocument()
    expect(within(banner).getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
  })

  it('sends what was typed to onSearch when the form is submitted, and does not reload the page', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()
    render(<Header onSearch={onSearch} />)

    await user.type(screen.getByRole('textbox', { name: 'Search products' }), 'something to type on{Enter}')

    expect(onSearch).toHaveBeenCalledWith('something to type on')
  })

  it('offers Sign in when nobody is signed in, and the name when someone is', () => {
    const { rerender } = render(<Header />)
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()

    rerender(<Header userName="Test Person" />)
    expect(screen.getByRole('button', { name: 'Account: Test Person' })).toBeInTheDocument()
  })

  it('says how many items are in the cart, and shows no badge for none', () => {
    const { container, rerender } = render(<Header />)
    expect(container.querySelector('.ed-cart-count')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cart, 0 items' })).toBeInTheDocument()

    rerender(<Header cartCount={3} />)
    expect(screen.getByRole('button', { name: 'Cart, 3 items' })).toBeInTheDocument()
    expect(container.querySelector('.ed-cart-count')).toHaveTextContent('3')
  })

  it('lets the app put its own logo link, account, cart and tools in', () => {
    render(
      <Header
        brand={<a href="/">Home</a>}
        account={<a href="/sign-in">Log in</a>}
        cart={<a href="/cart">Basket</a>}
        tools={<button type="button">Theme</button>}
      />,
    )

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Basket' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Theme' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'EcomDemo' })).not.toBeInTheDocument()
  })
})
