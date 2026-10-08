import { createEvent, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { fakeCart } from '@/test/msw/cart'
import { manyProducts, productHandlers, SERVER_ERROR_CORRELATION_ID } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'

/** The list item that holds the product with this name. */
async function findProductItem(name: string) {
  const heading = await screen.findByRole('heading', { name })
  const item = screen.getAllByRole('listitem').find((li) => li.contains(heading))
  if (!item) throw new Error(`No list item holds the product "${name}"`)
  return item
}

/** The category chips: toggle buttons named "Kitchen 1" (label and count). */
const categoryGroup = () => within(screen.getByRole('group', { name: 'Category' }))
const chip = (label: string) => categoryGroup().getByRole('button', { name: new RegExp(`^${label}\\b`) })

const itemNames = () => screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)

describe('the product list', () => {
  it('shows a loading message, then the products', async () => {
    renderRoute('/')

    expect(await screen.findByRole('status')).toHaveTextContent('Loading products…')

    expect(await screen.findByRole('heading', { name: 'Test Kettle' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('formats prices in rupees with Indian digit grouping', async () => {
    renderRoute('/')

    expect(within(await findProductItem('Test Kettle')).getByText('₹1,299.00')).toBeInTheDocument()
    expect(within(await findProductItem('Test Sofa')).getByText('₹1,25,000.50')).toBeInTheDocument()
  })

  it('shows "Other" for a product without a category', async () => {
    renderRoute('/')

    expect(within(await findProductItem('Test Gift Card')).getByText('Other')).toBeInTheDocument()
    expect(within(await findProductItem('Test Kettle')).getByText('Kitchen')).toBeInTheDocument()
  })

  it('says so when there are no products', async () => {
    server.use(productHandlers.empty)
    renderRoute('/')

    expect(await screen.findByText('No products yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('links every product to its page', async () => {
    renderRoute('/')

    const link = within(await findProductItem('Test Sofa')).getByRole('link', { name: 'Test Sofa' })

    expect(link).toHaveAttribute('href', '/products/2')
  })

  it('announces the count of what is shown', async () => {
    renderRoute('/')

    expect(await screen.findByText('Showing 1–3 of 3 products')).toBeInTheDocument()
  })
})

describe('errors and retry', () => {
  it('shows the server’s error message and the correlation id on a 500, with a Retry button', async () => {
    server.use(productHandlers.serverError)
    renderRoute('/')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The catalogue is unavailable right now.')
    expect(alert).toHaveTextContent(SERVER_ERROR_CORRELATION_ID)
    expect(within(alert).getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('shows the correlation id it sent when the server cannot be reached', async () => {
    let sentId = ''
    server.use(
      // No response at all, like the gateway being down: fetch() rejects.
      http.get('/api/products', ({ request }) => {
        sentId = request.headers.get('X-Correlation-Id') ?? ''
        return HttpResponse.error()
      }),
    )
    renderRoute('/')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Could not reach the server. Check your connection and try again.')
    expect(sentId).toMatch(/^[0-9a-f-]{36}$/)
    expect(within(alert).getByText(sentId)).toBeInTheDocument()
  })

  it('loads the products when Retry is pressed after a failure', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(
        '/api/products',
        () => HttpResponse.json({ status: 500, message: 'The catalogue is unavailable right now.' }, { status: 500 }),
        { once: true },
      ),
    )
    renderRoute('/')
    await user.click(await within(await screen.findByRole('alert')).findByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('heading', { name: 'Test Kettle' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('does not show a correlation id for a client error', async () => {
    server.use(
      http.get('/api/products', () =>
        HttpResponse.json(
          { status: 403, message: 'Not permitted' },
          { status: 403, headers: { 'X-Correlation-Id': 'abc12345' } },
        ),
      ),
    )
    renderRoute('/')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Not permitted')
    expect(alert).not.toHaveTextContent('abc12345')
  })
})

describe('filter and sort, kept in the URL', () => {
  it('filters by a category derived from the products, and puts it in the URL', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/')
    await screen.findByRole('heading', { name: 'Test Kettle' })

    expect(
      categoryGroup()
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Everything 3', 'Furniture 1', 'Kitchen 1', 'Other 1'])
    expect(chip('Everything')).toHaveAttribute('aria-pressed', 'true')
    await user.click(chip('Kitchen'))

    expect(itemNames()).toEqual(['Test Kettle'])
    expect(chip('Kitchen')).toHaveAttribute('aria-pressed', 'true')
    expect(chip('Everything')).toHaveAttribute('aria-pressed', 'false')
    expect(router.state.location.search).toBe('?category=Kitchen')
    expect(screen.getByText('Showing 1–1 of 1 products')).toBeInTheDocument()
  })

  it('goes back to every product from the Everything chip, and drops the category from the URL', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/?category=Kitchen')
    await screen.findByRole('heading', { name: 'Test Kettle' })
    expect(itemNames()).toEqual(['Test Kettle'])

    await user.click(chip('Everything'))

    expect(itemNames()).toEqual(['Test Gift Card', 'Test Kettle', 'Test Sofa'])
    expect(router.state.location.search).toBe('')
  })

  it('groups products without a category under "Other"', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    await screen.findByRole('heading', { name: 'Test Kettle' })

    await user.click(chip('Other'))

    expect(itemNames()).toEqual(['Test Gift Card'])
  })

  it('sorts by name by default, then by price either way, and puts the sort in the URL', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/')
    await screen.findByRole('heading', { name: 'Test Kettle' })
    expect(itemNames()).toEqual(['Test Gift Card', 'Test Kettle', 'Test Sofa'])

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'price')
    expect(itemNames()).toEqual(['Test Gift Card', 'Test Kettle', 'Test Sofa'])
    expect(router.state.location.search).toBe('?sort=price')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'price-desc')
    expect(itemNames()).toEqual(['Test Sofa', 'Test Kettle', 'Test Gift Card'])
    expect(router.state.location.search).toBe('?sort=price-desc')
  })

  it('opens already filtered and sorted from a shared link', async () => {
    renderRoute('/?category=Kitchen&sort=price-desc')

    expect(await screen.findByRole('heading', { name: 'Test Kettle' })).toBeInTheDocument()
    expect(itemNames()).toEqual(['Test Kettle'])
    expect(chip('Kitchen')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('price-desc')
  })

  it('says so, and offers the whole shelf, for a category nothing is in', async () => {
    renderRoute('/?category=Gone')

    expect(await screen.findByText('No products match.')).toBeInTheDocument()
    expect(chip('Gone')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('link', { name: 'Show all products' })).toHaveAttribute('href', '/')
  })

  it('never submits the filter form: the controls act as they change', async () => {
    renderRoute('/')
    await screen.findByRole('heading', { name: 'Test Kettle' })
    const form = screen.getByRole('form', { name: 'Filter and sort the products' })

    const submit = createEvent.submit(form)
    fireEvent(form, submit)

    expect(submit.defaultPrevented).toBe(true)
  })

  it('follows the browser’s back button through filter changes', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/')
    await screen.findByRole('heading', { name: 'Test Kettle' })
    await user.click(chip('Kitchen'))
    expect(itemNames()).toEqual(['Test Kettle'])

    await router.navigate(-1)

    await waitFor(() => {
      expect(itemNames()).toEqual(['Test Gift Card', 'Test Kettle', 'Test Sofa'])
    })
    expect(chip('Everything')).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('pagination', () => {
  const thirtyProducts = () => server.use(http.get('/api/products', () => HttpResponse.json(manyProducts(30))))

  it('shows 24 products a page and a pager', async () => {
    thirtyProducts()
    renderRoute('/')

    expect(await screen.findByText('Showing 1–24 of 30 products')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(24)
    const pager = screen.getByRole('navigation', { name: 'Pagination' })
    expect(within(pager).getByText('Page 1 of 2')).toBeInTheDocument()
    expect(within(pager).queryByRole('link', { name: 'Previous page' })).not.toBeInTheDocument()
  })

  it('goes to the next page and back, keeping the page in the URL', async () => {
    const user = userEvent.setup()
    thirtyProducts()
    const { router } = renderRoute('/')
    await user.click(await screen.findByRole('link', { name: 'Next page' }))

    expect(await screen.findByText('Showing 25–30 of 30 products')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(6)
    expect(router.state.location.search).toBe('?page=2')
    expect(screen.queryByRole('link', { name: 'Next page' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Previous page' }))
    expect(await screen.findByText('Showing 1–24 of 30 products')).toBeInTheDocument()
    expect(router.state.location.search).toBe('')
  })

  it('opens on the page the link names', async () => {
    thirtyProducts()
    renderRoute('/?page=2')

    expect(await screen.findByText('Showing 25–30 of 30 products')).toBeInTheDocument()
  })

  it('shows the last page for a page past the end', async () => {
    thirtyProducts()
    renderRoute('/?page=99')

    expect(await screen.findByText('Showing 25–30 of 30 products')).toBeInTheDocument()
  })

  it('returns to page 1 when the filter changes, and keeps the sort across pages', async () => {
    const user = userEvent.setup()
    thirtyProducts()
    const { router } = renderRoute('/?page=2&sort=price-desc')
    await screen.findByText('Showing 25–30 of 30 products')

    await user.click(chip('Audio'))

    expect(await screen.findByText('Showing 1–15 of 15 products')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?category=Audio&sort=price-desc')
  })
})

describe('prefetching', () => {
  it('starts loading a product when its card is hovered, so opening it asks the server nothing more', async () => {
    const user = userEvent.setup()
    let requests = 0
    server.use(
      http.get('/api/products/:id', ({ params }) => {
        requests++
        return HttpResponse.json({
          id: Number(params.id),
          name: 'Test Kettle',
          description: 'Fixture product',
          price: 1299,
          stockQuantity: 5,
          category: 'Kitchen',
        })
      }),
    )
    renderRoute('/')
    const link = within(await findProductItem('Test Kettle')).getByRole('link', { name: 'Test Kettle' })

    await user.hover(link)
    await waitFor(() => {
      expect(requests).toBe(1)
    })
    await user.click(link)

    expect(await screen.findByRole('heading', { level: 1, name: 'Test Kettle' })).toBeInTheDocument()
    expect(requests).toBe(1)
  })

  it('also prefetches on keyboard focus', async () => {
    const user = userEvent.setup()
    const requested: string[] = []
    server.use(
      http.get('/api/products/:id', ({ params }) => {
        requested.push(String(params.id))
        return HttpResponse.json({ status: 404, message: 'x' }, { status: 404 })
      }),
    )
    renderRoute('/')
    const link = within(await findProductItem('Test Kettle')).getByRole('link', { name: 'Test Kettle' })

    // Tab until the product link has focus, as a keyboard user would.
    for (let step = 0; step < 30 && link !== document.activeElement; step++) await user.tab()

    expect(link).toHaveFocus()
    // Tabbing past the products before it prefetched those too; the focused one is among them.
    await waitFor(() => {
      expect(requested).toContain('1')
    })
  })
})

describe('adding to the cart from the shelf', () => {
  it('adds a product for a customer, and the card then says how many are in the cart', async () => {
    const cart = fakeCart()
    server.use(...cart.handlers)
    const user = userEvent.setup()
    renderRoute('/', { signedInAs: 'CUSTOMER' })
    await screen.findByRole('heading', { level: 2, name: 'Test Kettle' })

    await user.click(screen.getAllByRole('button', { name: 'Add to cart' })[0]!)

    expect(await screen.findByRole('button', { name: 'In your cart (1)' })).toBeInTheDocument()
    expect(cart.calls).toEqual(['POST 3 x1'])
  })

  it('sends someone who is signed out to sign in, and back to the shelf', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/')
    await screen.findByRole('heading', { level: 2, name: 'Test Kettle' })

    await user.click(screen.getAllByRole('button', { name: 'Add to cart' })[0]!)

    // The sign-in page is a lazy route: the router commits the new location once its code has arrived.
    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
    expect(router.state.location.search).toBe('?next=%2F')
  })

  it('shows why an add was refused, and lets the message go', async () => {
    server.use(...fakeCart({ refuse: { status: 404, message: 'Product 1 not found' } }).handlers)
    const user = userEvent.setup()
    renderRoute('/', { signedInAs: 'CUSTOMER' })
    await screen.findByRole('heading', { level: 2, name: 'Test Kettle' })

    await user.click(screen.getAllByRole('button', { name: 'Add to cart' })[0]!)

    expect(await screen.findByRole('alert')).toHaveTextContent('Product 1 not found')
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('offers an admin no Add to cart', async () => {
    renderRoute('/', { signedInAs: 'ADMIN' })
    await screen.findByRole('heading', { level: 2, name: 'Test Kettle' })

    expect(screen.queryByRole('button', { name: 'Add to cart' })).not.toBeInTheDocument()
  })

  it('shows a catalogue larger than one page of the backend, all of it', async () => {
    const everything = manyProducts(250)
    server.use(
      http.get('/api/products', ({ request }) => {
        const url = new URL(request.url)
        const page = Number(url.searchParams.get('page') ?? 0)
        const size = Number(url.searchParams.get('size') ?? 50)
        const last = Math.ceil(everything.length / size) - 1
        const next =
          page < last
            ? `</api/products?page=${page + 1}&size=${size}>; rel="next"`
            : `</api/products?page=0&size=${size}>; rel="first"`
        return HttpResponse.json(everything.slice(page * size, (page + 1) * size), {
          headers: { 'X-Total-Count': String(everything.length), Link: next },
        })
      }),
    )
    renderRoute('/')

    expect(await screen.findByText('Showing 1–24 of 250 products')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 11')).toBeInTheDocument()
  })

  it('says when to try again when the catalogue is down for a while', async () => {
    server.use(
      http.get('/api/products', () =>
        HttpResponse.json(
          { status: 503, message: 'The product catalogue is temporarily unavailable. Please try again shortly.' },
          { status: 503, headers: { 'Retry-After': '10', 'X-Correlation-Id': 'catalogue-down-0001' } },
        ),
      ),
    )
    renderRoute('/')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The product catalogue is temporarily unavailable.')
    expect(alert).toHaveTextContent('Try again in about 10 seconds.')
    expect(alert).toHaveTextContent('catalogue-down-0001')
    expect(alert).not.toHaveTextContent('503')
    expect(within(alert).getByRole('button', { name: 'Retry' })).toBeEnabled()
  })
})
