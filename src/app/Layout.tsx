import { useEffect, useRef, type MouseEvent } from 'react'
import { Link, Outlet, ScrollRestoration, useLocation, useMatches } from 'react-router'
import { site } from '@/content/site'

/** Each route names its page in `handle.title`; the layout turns it into the document title. */
export type RouteHandle = { title: string }

function isRouteHandle(handle: unknown): handle is RouteHandle {
  return typeof handle === 'object' && handle !== null && 'title' in handle && typeof handle.title === 'string'
}

export function Layout() {
  const { pathname } = useLocation()
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

  return (
    <>
      <a href="#main" onClick={skipToContent}>
        Skip to content
      </a>
      <header>
        <Link to="/">{site.storeName}</Link>
        <nav aria-label="Primary">
          <Link to="/search">Search</Link> <Link to="/cart">Cart</Link>
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer>
        <p>{site.operator}</p>
        <p>{site.contactEmail}</p>
        <p>Ships from: {site.shipsFrom}</p>
        <nav aria-label="Store information">
          <Link to="/about">About</Link> <Link to="/returns">Returns</Link> <Link to="/shipping">Shipping</Link>{' '}
          <Link to="/privacy">Privacy</Link> <Link to="/terms">Terms</Link>
        </nav>
      </footer>
      <ScrollRestoration />
    </>
  )
}
