import type { FormEvent, ReactNode } from 'react'
import { Button } from '../Button'
import { Logo } from '../Logo'
import { TextField } from '../TextField'
import './Header.css'

export type HeaderProps = {
  /** The count on the cart button; zero shows no badge. */
  cartCount?: number
  /** The signed-in customer's name; without one the button says "Sign in". */
  userName?: string
  placeholder?: string
  onSearch?: (query: string) => void
  /** Replaces the logo, for example with a router link around it. */
  brand?: ReactNode
  /** Replaces the whole search form, for example with a box that suggests products as you type. */
  search?: ReactNode
  /** Replaces the account button (a link, in the app). */
  account?: ReactNode
  /** Replaces the cart button (a link, in the app). The count badge is drawn over it either way. */
  cart?: ReactNode
  /** Extra controls placed before the account button, such as the theme switch. */
  tools?: ReactNode
}

/** Rearranges itself when its container is narrower than 640px: the search drops to its own row. */
export function Header({
  cartCount = 0,
  userName,
  placeholder = 'Search, or describe what you need',
  onSearch,
  search,
  brand,
  account,
  cart,
  tools,
}: HeaderProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = new FormData(event.currentTarget).get('q')
    onSearch?.(typeof query === 'string' ? query : '')
  }
  return (
    <div className="ed-header-wrap">
      <header className="ed-header">
        {brand ?? <Logo height={26} />}
        {search ?? (
          <form className="ed-header-search" role="search" onSubmit={submit}>
            <TextField name="q" icon="search" placeholder={placeholder} aria-label="Search products" />
          </form>
        )}
        <nav className="ed-header-nav" aria-label="Primary">
          {tools}
          {account ?? (
            <Button variant="ghost" icon="user" aria-label={userName ? `Account: ${userName}` : 'Sign in'}>
              {userName ?? 'Sign in'}
            </Button>
          )}
          <span className="ed-cart-btn">
            {cart ?? <Button variant="secondary" icon="cart" aria-label={`Cart, ${cartCount} items`} />}
            {cartCount ? (
              <span className="ed-cart-count" aria-hidden>
                {cartCount}
              </span>
            ) : null}
          </span>
        </nav>
      </header>
    </div>
  )
}
