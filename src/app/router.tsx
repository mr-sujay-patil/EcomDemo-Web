import { createBrowserRouter, type RouteObject } from 'react-router'
import { PlaceholderPage } from '@/components/PlaceholderPage'
import { AboutPage } from '@/features/content/AboutPage'
import { PrivacyPage } from '@/features/content/PrivacyPage'
import { ReturnsPage } from '@/features/content/ReturnsPage'
import { ShippingPage } from '@/features/content/ShippingPage'
import { TermsPage } from '@/features/content/TermsPage'
import { ProductListPage } from '@/features/catalog/ProductListPage'
import { ProductPage } from '@/features/catalog/ProductPage'
import { Layout, type RouteHandle } from './Layout'
import { NotFoundPage } from './NotFoundPage'

function route(path: string, title: string, element: RouteObject['element']): RouteObject {
  const handle: RouteHandle = { title }
  return { path, element, handle }
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
    // Shown while a lazy route's code loads on the very first page view (before the layout exists).
    HydrateFallback: () => <p role="status">Loading…</p>,
    children: [
      { index: true, element: <ProductListPage />, handle: { title: 'Products' } satisfies RouteHandle },
      route('products/:id', 'Product', <ProductPage />),
      route('search', 'Search', <PlaceholderPage title="Search" phase={15} />),
      route('cart', 'Your cart', <PlaceholderPage title="Your cart" phase={12} />),
      {
        path: 'checkout',
        handle: { title: 'Checkout' } satisfies RouteHandle,
        lazy: async () => ({ Component: (await import('@/features/checkout/CheckoutPage')).CheckoutPage }),
      },
      route('orders', 'Your orders', <PlaceholderPage title="Your orders" phase={14} />),
      route('orders/:id', 'Order', <PlaceholderPage title="Order" phase={13} />),
      route('account', 'Your account', <PlaceholderPage title="Your account" phase={14} />),
      route('sign-in', 'Sign in', <PlaceholderPage title="Sign in" phase={11} />),
      route('register', 'Create an account', <PlaceholderPage title="Create an account" phase={10} />),
      {
        path: 'admin/*',
        handle: { title: 'Admin' } satisfies RouteHandle,
        lazy: async () => ({ Component: (await import('@/features/admin/AdminPage')).AdminPage }),
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
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}
