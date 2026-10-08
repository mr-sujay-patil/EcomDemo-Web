import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeAll, describe, expect, it } from 'vitest'
import { server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'
import { preloadAdminConsole } from '@/test/preloadAdminConsole'

const stockHandler = http.get('/api/inventory', ({ request }) => {
  const ids = new URL(request.url).searchParams.get('productIds')?.split(',').map(Number) ?? []
  return HttpResponse.json(ids.map((productId) => ({ productId, quantity: productId * 10 })))
})

// The admin console is a lazy route: load it outside the first test's clock (web KI-029).
beforeAll(preloadAdminConsole)

describe('stock', () => {
  it('asks for every product at once, comma-separated, and shows each level', async () => {
    let query: string | null = null
    server.use(
      http.get('/api/inventory', ({ request }) => {
        query = new URL(request.url).searchParams.get('productIds')
        return HttpResponse.json([{ productId: 1, quantity: 7 }])
      }),
    )
    renderRoute('/admin/stock', { signedInAs: 'ADMIN' })

    const row = await screen.findByRole('row', { name: /Test Kettle/ })
    expect(await within(row).findByText('7')).toBeInTheDocument()
    expect(query).toMatch(/^1,2,3/)
    expect(screen.getByText(/sets/i)).toBeInTheDocument()
  })

  it('sets a level: the typed number is the body, not a delta', async () => {
    let sent: unknown
    let path = ''
    server.use(
      stockHandler,
      http.put('/api/inventory/:id', async ({ request, params }) => {
        sent = await request.json()
        path = String(params.id)
        return HttpResponse.json({ productId: 1, quantity: 40 })
      }),
    )
    const user = userEvent.setup()
    renderRoute('/admin/stock', { signedInAs: 'ADMIN' })

    await user.type(await screen.findByLabelText('New level for Test Kettle'), '40')
    await user.click(
      within(screen.getByRole('form', { name: 'Set stock for Test Kettle' })).getByRole('button', {
        name: 'Set stock',
      }),
    )
    expect(await screen.findByText('Stock is now 40.')).toBeInTheDocument()
    expect(sent).toEqual({ quantity: 40 })
    expect(path).toBe('1')
  })

  it.each(['', '-3', '2.5', 'many'])('refuses %j without asking the server', async (typed) => {
    let puts = 0
    server.use(
      stockHandler,
      http.put('/api/inventory/:id', () => {
        puts += 1
        return HttpResponse.json({ productId: 1, quantity: 0 })
      }),
    )
    const user = userEvent.setup()
    renderRoute('/admin/stock', { signedInAs: 'ADMIN' })

    const box = await screen.findByLabelText('New level for Test Kettle')
    if (typed) await user.type(box, typed)
    await user.click(
      within(screen.getByRole('form', { name: 'Set stock for Test Kettle' })).getByRole('button', {
        name: 'Set stock',
      }),
    )
    expect(await screen.findByText('Use a whole number, 0 or more.')).toBeInTheDocument()
    expect(puts).toBe(0)
  })

  it("shows the server's reason when a level is refused", async () => {
    server.use(
      stockHandler,
      http.put('/api/inventory/:id', () =>
        HttpResponse.json({ status: 400, message: 'quantity: must not be negative' }, { status: 400 }),
      ),
    )
    const user = userEvent.setup()
    renderRoute('/admin/stock', { signedInAs: 'ADMIN' })

    await user.type(await screen.findByLabelText('New level for Test Kettle'), '5')
    await user.click(
      within(screen.getByRole('form', { name: 'Set stock for Test Kettle' })).getByRole('button', {
        name: 'Set stock',
      }),
    )
    expect(await screen.findByText(/must not be negative/)).toBeInTheDocument()
  })
})

const run = (overrides: object = {}) => ({
  executionId: 3,
  status: 'STARTED',
  totalProducts: 4,
  read: 1,
  written: 1,
  indexedProducts: 1,
  startedAt: '2026-10-08T10:00:00Z',
  endedAt: '2026-10-08T10:00:00Z',
  failure: '',
  ...overrides,
})

describe('the search index', () => {
  it('starts a rebuild, polls its run, and says when it is done', async () => {
    let polls = 0
    server.use(
      http.post('/api/products/embeddings/backfill', () => HttpResponse.json(run(), { status: 202 })),
      http.get('/api/products/embeddings/backfill/:id', () => {
        polls += 1
        return HttpResponse.json(polls < 2 ? run() : run({ status: 'COMPLETED', written: 4, indexedProducts: 4 }))
      }),
    )
    const user = userEvent.setup()
    renderRoute('/admin/search-index', { signedInAs: 'ADMIN' })

    await user.click(await screen.findByRole('button', { name: 'Rebuild the search index' }))
    expect(await screen.findByText(/STARTED: 1 of 4 written/)).toBeInTheDocument()
    expect(await screen.findByText('Done: 4 of 4 products are indexed.', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(polls).toBe(2)
  })

  it('says search is not available on a 503', async () => {
    server.use(
      http.post('/api/products/embeddings/backfill', () =>
        HttpResponse.json({ status: 503, message: 'No embedding model' }, { status: 503 }),
      ),
    )
    const user = userEvent.setup()
    renderRoute('/admin/search-index', { signedInAs: 'ADMIN' })

    await user.click(await screen.findByRole('button', { name: 'Rebuild the search index' }))
    expect(await screen.findByText('Search is not available right now.')).toBeInTheDocument()
  })

  it('shows why a run failed', async () => {
    server.use(
      http.post('/api/products/embeddings/backfill', () =>
        HttpResponse.json(run({ status: 'FAILED', failure: 'Provider timed out' }), { status: 202 }),
      ),
      http.get('/api/products/embeddings/backfill/:id', () =>
        HttpResponse.json(run({ status: 'FAILED', failure: 'Provider timed out' })),
      ),
    )
    const user = userEvent.setup()
    renderRoute('/admin/search-index', { signedInAs: 'ADMIN' })

    await user.click(await screen.findByRole('button', { name: 'Rebuild the search index' }))
    expect(await screen.findByText(/The run failed\. Provider timed out/)).toBeInTheDocument()
  })
})
