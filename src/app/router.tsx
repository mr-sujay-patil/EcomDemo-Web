import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { RequireRole } from '@/features/auth/RequireRole'
import { AboutPage } from '@/features/content/AboutPage'
import { PrivacyPage } from '@/features/content/PrivacyPage'
import { ReturnsPage } from '@/features/content/ReturnsPage'
import { ShippingPage } from '@/features/content/ShippingPage'
import { TermsPage } from '@/features/content/TermsPage'
import { ProductListPage } from '@/features/catalog/ProductListPage'
import { ProductPage } from '@/features/catalog/ProductPage'
import { SearchPage } from '@/features/search/SearchPage'
import { RootRouteError, RouteError } from './ErrorPages'
import { Layout, type RouteHandle } from './Layout'
import { NotFoundPage } from './NotFoundPage'

function route(path: string, title: string, element: RouteObject['element']): RouteObject {
  const handle: RouteHandle = { title }
  return { path, element, handle }
}

/**
 * A page whose code is fetched when it is first visited, not with the shelf. Sign-in and registration are the pages that
 * need the form libraries (zod and react-hook-form are about a third of the shelf's JavaScript). (The search and
 * content pages stay in the entry on purpose: making them lazy added shared chunks for the shelf to preload and made
 * the first paint 0.15 s later, docs/performance.md. The shelf and the product page are what a visitor lands on.)
 */
function lazyRoute(path: string, title: string, load: () => Promise<RouteObject['Component']>): RouteObject {
  const handle: RouteHandle = { title }
  return { path, handle, lazy: async () => ({ Component: await load() }) }
}

// The style guide ships only where a person looks at it: `npm run dev`, and the build the E2E suite previews
// (VITE_STYLEGUIDE=true in playwright.config.ts). The production build leaves the route and its code out.
const styleguide: RouteObject[] =
  import.meta.env.DEV || import.meta.env.VITE_STYLEGUIDE === 'true'
    ? [
        {
          path: 'styleguide',
          handle: { title: 'Style guide' } satisfies RouteHandle,
          lazy: async () => ({
            Component: (await import('@/features/styleguide/StyleguidePage')).StyleguidePage,
          }),
        },
      ]
    : []

// The route table. docs/architecture/routing.md says why each route exists.
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    // The layout itself broke: nothing of the shop can be assumed, so a page of its own, with no header or footer.
    errorElement: <RootRouteError />,
    // Shown while a lazy route's code loads on the very first page view (before the layout exists).
    HydrateFallback: () => <p role="status">Loading…</p>,
    children: [
      {
        // A route broke: its content is replaced by the error page, the layout around it (header, footer) stays usable.
        errorElement: <RouteError />,
        children: [
          { index: true, element: <ProductListPage />, handle: { title: 'Products' } satisfies RouteHandle },
          route('products/:id', 'Product', <ProductPage />),
          route('search', 'Search', <SearchPage />),
          // Signed in as a customer: the cart, checkout and orders. Signed out they go to /sign-in?next=…
          {
            element: <RequireRole role="CUSTOMER" />,
            children: [
              {
                path: 'cart',
                handle: { title: 'Your cart' } satisfies RouteHandle,
                lazy: async () => ({ Component: (await import('@/features/cart/CartPage')).CartPage }),
              },
              // Placing the order is the cart's button (one click, no address, web KI-008): /checkout is only an old address.
              { path: 'checkout', element: <Navigate to="/cart" replace /> },
              // List and detail share the /orders path: the list is the index, an order opens under it.
              {
                path: 'orders',
                children: [
                  {
                    index: true,
                    handle: { title: 'Your orders' } satisfies RouteHandle,
                    lazy: async () => ({ Component: (await import('@/features/orders/OrdersPage')).OrdersPage }),
                  },
                  {
                    path: ':id',
                    handle: { title: 'Order' } satisfies RouteHandle,
                    lazy: async () => ({ Component: (await import('@/features/checkout/OrderPage')).OrderPage }),
                  },
                ],
              },
              {
                path: 'account',
                handle: { title: 'Your account' } satisfies RouteHandle,
                lazy: async () => ({ Component: (await import('@/features/accounts/ProfilePage')).ProfilePage }),
              },
            ],
          },
          lazyRoute('sign-in', 'Sign in', async () => (await import('@/features/accounts/SignInPage')).SignInPage),
          lazyRoute(
            'register',
            'Create an account',
            async () => (await import('@/features/accounts/RegisterPage')).RegisterPage,
          ),
          // Signed in as an admin: the console.
          {
            element: <RequireRole role="ADMIN" />,
            children: [
              {
                path: 'admin/*',
                handle: { title: 'Admin' } satisfies RouteHandle,
                lazy: async () => ({ Component: (await import('@/features/admin/AdminPage')).AdminPage }),
              },
            ],
          },
          route('about', 'About', <AboutPage />),
          route('returns', 'Returns', <ReturnsPage />),
          route('shipping', 'Shipping', <ShippingPage />),
          route('privacy', 'Privacy', <PrivacyPage />),
          route('terms', 'Terms', <TermsPage />),
          ...styleguide,
          route('*', 'Page not found', <NotFoundPage />),
        ],
      },
    ],
  },
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}
