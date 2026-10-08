import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { productFixtures, searchHandlers } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'

const productNames = () => screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)

describe('the search page', () => {
  it('asks what to look for when there is no query, and sends no request', async () => {
    let calls = 0
    server.use(
      http.get('/api/products/search', () => {
        calls += 1
        return HttpResponse.json({ query: '', results: [] })
      }),
    )
    renderRoute('/search')

    expect(await screen.findByRole('heading', { level: 1, name: 'Search' })).toBeInTheDocument()
    expect(screen.getByText(/Type what you are looking for/)).toBeInTheDocument()
    expect(calls).toBe(0)
  })

  it('shows the results in the order the server ranked them, with no similarity', async () => {
    renderRoute('/search?q=something+to+type+on')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Results for “something to type on”' }),
    ).toBeInTheDocument()
    await screen.findByRole('heading', { level: 2, name: 'Test Gift Card' })
    // The fixture server ranks the catalogue backwards: the page must not re-sort.
    expect(productNames()).toEqual(['Test Gift Card', 'Test Sofa', 'Test Kettle'])
    expect(screen.getByText('3 products, best match first')).toBeInTheDocument()
    expect(screen.queryByText('0.9')).not.toBeInTheDocument()
    expect(screen.queryByText('0.8')).not.toBeInTheDocument()
    expect(screen.queryByText(/similarity/i)).not.toBeInTheDocument()
  })

  it('sends the query and the filters from the URL to the backend, with limit 20', async () => {
    const seen: URL[] = []
    server.use(
      http.get('/api/products/search', ({ request }) => {
        const url = new URL(request.url)
        // The header box's own suggestion request (limit 5) is not the page's.
        if (url.searchParams.get('limit') === '20') seen.push(url)
        return HttpResponse.json({ query: 'lamp', results: [] })
      }),
    )
    renderRoute('/search?q=lamp&category=Kitchen&minPrice=100&maxPrice=900')

    expect(await screen.findByText(/Nothing matches “lamp”/)).toBeInTheDocument()

    const params = seen[0]!.searchParams
    expect(Object.fromEntries(params)).toEqual({
      q: 'lamp',
      category: 'Kitchen',
      minPrice: '100',
      maxPrice: '900',
      limit: '20',
    })
  })

  it('starts the filter form from the URL', async () => {
    renderRoute('/search?q=lamp&category=Kitchen&minPrice=100&maxPrice=900')

    await screen.findByRole('heading', { level: 1, name: 'Results for “lamp”' })
    expect(screen.getByLabelText('Lowest price')).toHaveValue(100)
    expect(screen.getByLabelText('Highest price')).toHaveValue(900)
    // The catalogue may not hold the category yet; the control still names it.
    await waitFor(() => expect(screen.getByLabelText('Category')).toHaveValue('Kitchen'))
  })

  it('writes the filters into the URL when Apply is pressed, and keeps the query', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/search?q=lamp')
    await screen.findByRole('heading', { level: 1, name: 'Results for “lamp”' })
    await screen.findByRole('option', { name: 'Kitchen' })

    await user.selectOptions(screen.getByLabelText('Category'), 'Kitchen')
    await user.type(screen.getByLabelText('Highest price'), '2000')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(router.state.location.search).toBe('?q=lamp&category=Kitchen&maxPrice=2000')
    expect(await screen.findByRole('link', { name: 'Clear' })).toBeInTheDocument()
  })

  it('refuses a lowest price above the highest, without changing the URL', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/search?q=lamp')
    await screen.findByRole('heading', { level: 1, name: 'Results for “lamp”' })

    await user.type(screen.getByLabelText('Lowest price'), '900')
    await user.type(screen.getByLabelText('Highest price'), '100')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(screen.getByText(/The highest price is below the lowest/)).toBeInTheDocument()
    expect(router.state.location.search).toBe('?q=lamp')
  })

  it('says so when nothing matches', async () => {
    server.use(http.get('/api/products/search', () => HttpResponse.json({ query: 'zzz', results: [] })))
    renderRoute('/search?q=zzz')

    expect(await screen.findByText('Nothing matches “zzz”. Try other words, or fewer filters.')).toBeInTheDocument()
  })

  it('shows an error with a retry when the search fails for another reason', async () => {
    server.use(
      http.get('/api/products/search', () =>
        HttpResponse.json(
          { status: 500, message: 'Search broke.' },
          { status: 500, headers: { 'X-Correlation-Id': 'corr-1234' } },
        ),
      ),
    )
    renderRoute('/search?q=lamp')

    expect(await screen.findByText('Search broke.')).toBeInTheDocument()
    expect(screen.getByText('corr-1234')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  describe('when search by description is not available', () => {
    it('says so, filters the catalogue by words, and says which it used', async () => {
      server.use(searchHandlers.unavailable)
      renderRoute('/search?q=kettle')

      const alert = await screen.findByText("Search by description isn't available right now")
      expect(alert).toBeInTheDocument()
      expect(await screen.findByRole('heading', { level: 2, name: 'Test Kettle' })).toBeInTheDocument()
      expect(productNames()).toEqual(['Test Kettle'])
      expect(screen.getByText('1 product, matched on words in the name and description')).toBeInTheDocument()
      // Customer words, not system words.
      expect(screen.queryByText(/503/)).not.toBeInTheDocument()
    })

    it('applies the filters to the fallback too', async () => {
      server.use(searchHandlers.unavailable)
      renderRoute('/search?q=fixture&maxPrice=1000')

      expect(await screen.findByRole('heading', { level: 2, name: 'Test Gift Card' })).toBeInTheDocument()
      expect(productNames()).toEqual(['Test Gift Card'])
    })

    it('says so when the words match nothing', async () => {
      server.use(searchHandlers.unavailable)
      renderRoute('/search?q=zebra')

      expect(await screen.findByText(/Nothing matches “zebra”/)).toBeInTheDocument()
    })

    it('shows the catalogue error when the fallback cannot load the catalogue either', async () => {
      server.use(
        searchHandlers.unavailable,
        http.get('/api/products', () =>
          HttpResponse.json({ status: 500, message: 'Catalogue down.' }, { status: 500 }),
        ),
      )
      renderRoute('/search?q=kettle')

      expect(await screen.findByText('Catalogue down.')).toBeInTheDocument()
      expect(screen.getByText("Search by description isn't available right now")).toBeInTheDocument()
    })
  })

  describe('stale requests', () => {
    afterEach(() => vi.restoreAllMocks())

    it('never lets a slow earlier answer replace the answer for the current query', async () => {
      // The signal each search request was sent with, by query: TanStack aborts the old one when the key changes.
      const signals = new Map<string, AbortSignal>()
      const realFetch = globalThis.fetch
      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const request = input instanceof Request ? input : new Request(input, init)
        const url = new URL(request.url)
        if (url.pathname === '/api/products/search' && url.searchParams.get('limit') === '20') {
          signals.set(url.searchParams.get('q') ?? '', request.signal)
        }
        return realFetch(input, init)
      })
      server.use(
        http.get('/api/products/search', async ({ request }) => {
          const q = new URL(request.url).searchParams.get('q')
          if (q === 'old') {
            await delay(300)
            return HttpResponse.json({ query: 'old', results: [{ product: productFixtures[0]!, similarity: 0.5 }] })
          }
          return HttpResponse.json({ query: 'new', results: [{ product: productFixtures[1]!, similarity: 0.5 }] })
        }),
      )
      const { router } = renderRoute('/search?q=old')
      await screen.findByText('Searching…')

      await act(() => router.navigate('/search?q=new'))

      expect(await screen.findByRole('heading', { level: 2, name: 'Test Sofa' })).toBeInTheDocument()
      // Give the slow answer time to arrive; it must not appear.
      await delay(400)
      expect(screen.queryByRole('heading', { level: 2, name: 'Test Kettle' })).not.toBeInTheDocument()
      expect(within(screen.getByRole('main')).getByRole('heading', { level: 1 })).toHaveTextContent('Results for “new”')
      expect(signals.get('old')?.aborted).toBe(true)
      expect(signals.get('new')?.aborted).toBe(false)
    })
  })
})
