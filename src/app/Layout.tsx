import { lazy, Suspense, useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link, Outlet, ScrollRestoration, useLocation, useMatches } from 'react-router'
import { Button, buttonClass } from '@/components/Button'
import { Header } from '@/components/Header'
import { UnhandledRejectionNotice } from './UnhandledRejectionNotice'
import { Icon } from '@/components/Icon'
import { Logo } from '@/components/Logo'
import { site } from '@/content/site'
import { AccountMenu } from '@/features/auth/AccountMenu'
import { ExpiryNotice } from '@/features/auth/ExpiryNotice'
import { SearchBox } from '@/features/search/SearchBox'
import { useSession } from '@/features/auth/useSession'
import { countItems, useCart } from '@/features/cart/api'
import { countGuestItems } from '@/features/cart/guestCart'
import { GuestCartNotice } from '@/features/cart/GuestCartNotice'
import { useGuestCart } from '@/features/cart/useGuestCart'
import { PageTitleContext } from './pageTitle'
import { ThemeToggle } from './ThemeToggle'
import './Layout.css'

// The assistant's code (its conversation, its sheet) is fetched the first time someone reaches for it, not with the shelf.
// Hovering or focusing the button starts the fetch early, so by the click the sheet is usually already here.
const loadAssistantSheet = () => import('@/features/assistant/AssistantSheet')
const AssistantSheet = lazy(async () => ({ default: (await loadAssistantSheet()).AssistantSheet }))

/** Each route names its page in `handle.title`; the layout turns it into the document title. */
export type RouteHandle = { title: string }

function isRouteHandle(handle: unknown): handle is RouteHandle {
  return typeof handle === 'object' && handle !== null && 'title' in handle && typeof handle.title === 'string'
}

export function Layout() {
  const { pathname } = useLocation()
  const matches = useMatches()
  const handle = matches.map((match) => match.handle).findLast(isRouteHandle)
  // A page may name itself (a "Not permitted" standing in for the admin console); otherwise the route does.
  const [pageTitle, setPageTitle] = useState<string | null>(null)
  const [assistantOpen, setAssistantOpen] = useState(false)
  // Mounted from the first opening on, and kept: closing hides the sheet, it does not throw its conversation away.
  const [assistantMounted, setAssistantMounted] = useState(false)
  const { session, role } = useSession()
  const serverCart = useCart()
  const guestCart = useGuestCart()
  // Signed out, the count is the guest cart's (kept in this browser); signed in, the account's.
  const cartCount = session === null ? countGuestItems(guestCart.lines) : countItems(serverCart.data)
  const name = pageTitle ?? handle?.title
  const title = name ? `${site.storeName} · ${name}` : site.storeName

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
        search={<SearchBox />}
        tools={
          <>
            {role === 'ADMIN' && (
              <Link to="/admin" className={buttonClass({ variant: 'ghost' })}>
                <span>Admin</span>
              </Link>
            )}
            <Button
              variant="secondary"
              icon="chat"
              className="site-ask"
              // The words are hidden in a narrow header (see Layout.css), so the name is given here.
              aria-label="Ask the shop"
              onPointerEnter={() => void loadAssistantSheet()}
              onFocus={() => void loadAssistantSheet()}
              onClick={() => {
                setAssistantMounted(true)
                setAssistantOpen(true)
              }}
            >
              Ask the shop
            </Button>
            <ThemeToggle />
          </>
        }
        account={
          session ? (
            <AccountMenu />
          ) : (
            // The word is hidden in a narrow header (see Header.css), leaving the icon: the name is given here.
            <Link to="/sign-in" className={buttonClass({ variant: 'ghost' })} aria-label="Sign in">
              <Icon name="user" size={18} />
              <span>Sign in</span>
            </Link>
          )
        }
        cartCount={cartCount}
        cart={
          <Link
            to="/cart"
            className={buttonClass({ variant: 'secondary', iconOnly: true })}
            aria-label={cartCount ? `Cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}` : 'Cart'}
          >
            <Icon name="cart" size={18} />
          </Link>
        }
      />
      {assistantMounted && (
        <Suspense fallback={null}>
          <AssistantSheet open={assistantOpen} onClose={() => setAssistantOpen(false)} />
        </Suspense>
      )}
      <ExpiryNotice />
      <GuestCartNotice />
      <main id="main" className="site-main page" tabIndex={-1}>
        <PageTitleContext.Provider value={setPageTitle}>
          <UnhandledRejectionNotice />
          <Outlet />
        </PageTitleContext.Provider>
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
