import { useEffect, useRef, type MouseEvent } from 'react'
import { createSearchParams, Link, Outlet, ScrollRestoration, useLocation, useMatches, useNavigate } from 'react-router'
import { buttonClass } from '@/components/Button'
import { Header } from '@/components/Header'
import { Icon } from '@/components/Icon'
import { Logo } from '@/components/Logo'
import { site } from '@/content/site'
import { ThemeToggle } from './ThemeToggle'
import './Layout.css'

/** Each route names its page in `handle.title`; the layout turns it into the document title. */
export type RouteHandle = { title: string }

function isRouteHandle(handle: unknown): handle is RouteHandle {
  return typeof handle === 'object' && handle !== null && 'title' in handle && typeof handle.title === 'string'
}

export function Layout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const matches = useMatches()
  const handle = matches.map((match) => match.handle).findLast(isRouteHandle)
  const title = handle ? `${site.storeName} · ${handle.title}` : site.storeName

  useEffect(() => {
    document.title = title
  }, [title])

  // A screen reader only hears a new page if focus moves into it: after a client-side
  // navigation the browser does nothing, so the layout focuses the new page's h1. The ref
  // holds the path already handled, so the first render and StrictMode's second effect run
  // leave focus alone.
  const handledPath = useRef(pathname)
  useEffect(() => {
    if (handledPath.current === pathname) return
    handledPath.current = pathname
    const heading = document.querySelector<HTMLElement>('main h1')
    if (!heading) return
    heading.tabIndex = -1
    heading.focus()
  }, [pathname])

  function skipToContent(event: MouseEvent<HTMLAnchorElement>) {
    // The browser would scroll to #main but not always move focus there.
    event.preventDefault()
    document.getElementById('main')?.focus()
  }

  function search(query: string) {
    const trimmed = query.trim()
    void navigate({ pathname: '/search', search: trimmed ? `?${createSearchParams({ q: trimmed })}` : '' })
  }

  return (
    <div className="site">
      <a className="skip-link" href="#main" onClick={skipToContent}>
        Skip to content
      </a>
      <Header
        brand={
          <Link to="/" className="site-brand">
            <Logo height={26} />
          </Link>
        }
        onSearch={search}
        tools={<ThemeToggle />}
        account={
          <Link to="/sign-in" className={buttonClass({ variant: 'ghost' })}>
            <Icon name="user" size={18} />
            <span>Sign in</span>
          </Link>
        }
        cart={
          <Link to="/cart" className={buttonClass({ variant: 'secondary', iconOnly: true })} aria-label="Cart">
            <Icon name="cart" size={18} />
          </Link>
        }
      />
      <main id="main" className="site-main page" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="page site-footer-inner">
          <div className="site-footer-who">
            <p>{site.operator}</p>
            <p>{site.contactEmail}</p>
            <p>Ships from: {site.shipsFrom}</p>
          </div>
          <nav aria-label="Store information" className="site-footer-nav">
            <Link to="/about">About</Link>
            <Link to="/returns">Returns</Link>
            <Link to="/shipping">Shipping</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </nav>
        </div>
      </footer>
      <ScrollRestoration />
    </div>
  )
}
