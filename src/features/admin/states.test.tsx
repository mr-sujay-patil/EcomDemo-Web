import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { productFixtures, productHandlers, SERVER_ERROR_CORRELATION_ID } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'
import { importProducts, restartImport, startBackfill, fetchBackfill } from './batch'
import { createProduct, deleteProduct, generateDescription, updateProduct } from './products'
import { fetchDeadLetters, fetchReplays, replayDeadLetter } from './saga'
import { fetchStock, setStock } from './stock'
import { preloadAdminConsole } from '@/test/preloadAdminConsole'

const boom = (path: string, method: 'get' | 'post' | 'put' | 'delete' = 'get') =>
  http[method](path, () =>
    HttpResponse.json(
      { status: 500, message: 'The server fell over.' },
      { status: 500, headers: { 'X-Correlation-Id': SERVER_ERROR_CORRELATION_ID } },
    ),
  )

// The admin console is a lazy route: load it outside the first test's clock (web KI-029).
beforeAll(preloadAdminConsole)

describe('when a list cannot load', () => {
  it('products: says why, with a reference, and Retry asks again', async () => {
    server.use(productHandlers.serverError)
    const user = userEvent.setup()
    renderRoute('/admin/products', { signedInAs: 'ADMIN' })

    expect(await screen.findByText('The catalogue is unavailable right now.')).toBeInTheDocument()
    expect(screen.getByText(SERVER_ERROR_CORRELATION_ID)).toBeInTheDocument()
    server.use(productHandlers.success)
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('row', { name: /Test Kettle/ })).toBeInTheDocument()
  })

  it('products: says so when there are none', async () => {
    server.use(productHandlers.empty)
    renderRoute('/admin/products', { signedInAs: 'ADMIN' })
    expect(await screen.findByText(/no products yet/)).toBeInTheDocument()
  })

  it('stock: says why for the products and for the levels', async () => {
    server.use(boom('/api/inventory'))
    renderRoute('/admin/stock', { signedInAs: 'ADMIN' })
    expect(await screen.findByText('The server fell over.')).toBeInTheDocument()
  })

  it('stock: has nothing to set when there are no products', async () => {
    server.use(productHandlers.empty)
    renderRoute('/admin/stock', { signedInAs: 'ADMIN' })
    expect(await screen.findByText('There are no products yet.')).toBeInTheDocument()
  })

  it('stock: the products failing is shown too', async () => {
    server.use(productHandlers.serverError)
    renderRoute('/admin/stock', { signedInAs: 'ADMIN' })
    expect(await screen.findByText('The catalogue is unavailable right now.')).toBeInTheDocument()
  })

  it('dead letters and the replay log each show their own error', async () => {
    server.use(boom('/api/admin/dead-letters'), boom('/api/admin/dead-letters/replays'))
    renderRoute('/admin/dead-letters', { signedInAs: 'ADMIN' })
    await waitFor(() => {
      expect(screen.getAllByText('The server fell over.')).toHaveLength(2)
    })
  })

  it('every Retry asks again', async () => {
    server.use(boom('/api/admin/dead-letters'), boom('/api/admin/dead-letters/replays'))
    const user = userEvent.setup()
    renderRoute('/admin/dead-letters', { signedInAs: 'ADMIN' })

    const retries = await screen.findAllByRole('button', { name: 'Retry' })
    server.use(
      http.get('/api/admin/dead-letters', () => HttpResponse.json([])),
      http.get('/api/admin/dead-letters/replays', () => HttpResponse.json([])),
    )
    for (const retry of retries) await user.click(retry)
    expect(await screen.findByText('There are no dead letters.')).toBeInTheDocument()
    expect(await screen.findByText('Nothing has been replayed.')).toBeInTheDocument()
  })

  it('stock: Retry on the levels and on the products', async () => {
    const user = userEvent.setup()
    server.use(boom('/api/inventory'))
    renderRoute('/admin/stock', { signedInAs: 'ADMIN' })
    const retry = await screen.findByRole('button', { name: 'Retry' })
    server.use(http.get('/api/inventory', () => HttpResponse.json([{ productId: 1, quantity: 9 }])))
    await user.click(retry)
    expect(await screen.findByText('9')).toBeInTheDocument()
  })

  it('stock: Retry on a catalogue that failed', async () => {
    const user = userEvent.setup()
    server.use(productHandlers.serverError)
    renderRoute('/admin/stock', { signedInAs: 'ADMIN' })
    const retry = await screen.findByRole('button', { name: 'Retry' })
    server.use(
      productHandlers.success,
      http.get('/api/inventory', () => HttpResponse.json([{ productId: 1, quantity: 4 }])),
    )
    await user.click(retry)
    expect(await screen.findByText('4')).toBeInTheDocument()
  })

  it('an unknown console page says so', async () => {
    renderRoute('/admin/nope', { signedInAs: 'ADMIN' })
    expect(await screen.findByRole('heading', { name: 'Not found' })).toBeInTheDocument()
  })
})

describe('when a write fails', () => {
  it('a delete shows the reason and the support reference, and the backdrop closes the dialog', async () => {
    server.use(boom('/api/products/:id', 'delete'))
    const user = userEvent.setup()
    renderRoute('/admin/products', { signedInAs: 'ADMIN' })

    await user.click(await screen.findByRole('button', { name: 'Delete Test Kettle' }))
    await user.type(screen.getByLabelText('Product name'), 'Test Kettle')
    await user.click(screen.getByRole('button', { name: 'Delete product' }))
    expect(await screen.findByText('The server fell over.')).toBeInTheDocument()
    expect(screen.getByText(SERVER_ERROR_CORRELATION_ID)).toBeInTheDocument()

    // A click on the backdrop lands on the dialog element itself.
    fireEvent.click(document.querySelector('.admin-dialog')!)
    expect(screen.queryByRole('button', { name: 'Delete product' })).not.toBeInTheDocument()
  })

  it('the delete notice can be dismissed', async () => {
    server.use(http.delete('/api/products/:id', () => new HttpResponse(null, { status: 204 })))
    const user = userEvent.setup()
    renderRoute('/admin/products', { signedInAs: 'ADMIN' })

    await user.click(await screen.findByRole('button', { name: 'Delete Test Kettle' }))
    await user.type(screen.getByLabelText('Product name'), 'Test Kettle')
    await user.click(screen.getByRole('button', { name: 'Delete product' }))
    await user.click(await screen.findByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText('Deleted “Test Kettle”.')).not.toBeInTheDocument()
  })

  it('a product save that is not about a field shows above the form', async () => {
    server.use(boom('/api/products', 'post'))
    const user = userEvent.setup()
    renderRoute('/admin/products/new', { signedInAs: 'ADMIN' })

    await user.type(await screen.findByLabelText('Name'), 'A')
    await user.type(screen.getByLabelText('Price'), '5')
    await user.type(screen.getByLabelText('Stock'), '1')
    await user.click(screen.getByRole('button', { name: 'Create product' }))
    expect(await screen.findByText('The server fell over.')).toBeInTheDocument()
    expect(screen.getByText(SERVER_ERROR_CORRELATION_ID)).toBeInTheDocument()
  })

  it('a description over 1000 characters is refused on the field', async () => {
    const user = userEvent.setup()
    renderRoute('/admin/products/new', { signedInAs: 'ADMIN' })

    fireEvent.change(await screen.findByLabelText('Description'), { target: { value: 'x'.repeat(1001) } })
    await user.click(screen.getByRole('button', { name: 'Create product' }))
    expect(await screen.findByText('Use at most 1000 characters.')).toBeInTheDocument()
  })

  it('a product that fails to load can be retried', async () => {
    server.use(
      http.get('/api/products/:id', () =>
        HttpResponse.json({ status: 500, message: 'Catalogue down' }, { status: 500 }),
      ),
    )
    renderRoute('/admin/products/1', { signedInAs: 'ADMIN' })
    expect(await screen.findByText('Catalogue down')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('a product that failed to load loads on Retry', async () => {
    const user = userEvent.setup()
    server.use(boom('/api/products/:id'))
    renderRoute('/admin/products/1', { signedInAs: 'ADMIN' })
    const retry = await screen.findByRole('button', { name: 'Retry' })
    server.use(productHandlers.detail)
    await user.click(retry)
    expect(await screen.findByLabelText('Name')).toHaveValue('Test Kettle')
  })

  it('a rebuild that cannot start shows why and its reference; a run with no products has no progress bar', async () => {
    const user = userEvent.setup()
    server.use(boom('/api/products/embeddings/backfill', 'post'))
    renderRoute('/admin/search-index', { signedInAs: 'ADMIN' })
    await user.click(await screen.findByRole('button', { name: 'Rebuild the search index' }))
    expect(await screen.findByText('The server fell over.')).toBeInTheDocument()
    expect(screen.getByText(SERVER_ERROR_CORRELATION_ID)).toBeInTheDocument()

    const run = {
      executionId: 8,
      status: 'COMPLETED',
      totalProducts: 0,
      read: 0,
      written: 0,
      indexedProducts: 0,
      startedAt: '',
      endedAt: '',
      failure: '',
    }
    server.use(
      http.post('/api/products/embeddings/backfill', () => HttpResponse.json(run, { status: 202 })),
      boom('/api/products/embeddings/backfill/:id'),
    )
    await user.click(screen.getByRole('button', { name: 'Rebuild the search index' }))
    expect(await screen.findAllByText('The server fell over.')).not.toHaveLength(0)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('a dead letter with an unreadable time shows it as it came', async () => {
    server.use(
      http.get('/api/admin/dead-letters', () =>
        HttpResponse.json([
          {
            topic: 't.DLT',
            partition: 0,
            offset: 1,
            key: 'k',
            timestamp: 'yesterday-ish',
            originalTopic: 't',
            exceptionClass: 'E',
            exceptionMessage: 'm',
            payload: '{}',
            replayed: false,
          },
        ]),
      ),
      http.get('/api/admin/dead-letters/replays', () => HttpResponse.json([])),
    )
    renderRoute('/admin/dead-letters', { signedInAs: 'ADMIN' })
    expect(await screen.findByText('yesterday-ish')).toBeInTheDocument()
  })

  it('writing a description: another failure shows its reason; a failed restore says so', async () => {
    server.use(boom('/api/products/:id/generate-description', 'post'))
    const user = userEvent.setup()
    renderRoute('/admin/products/1', { signedInAs: 'ADMIN' })

    await user.click(await screen.findByRole('button', { name: 'Write a description' }))
    await user.click(screen.getByRole('button', { name: 'Write and replace' }))
    expect(await screen.findByText('The server fell over.')).toBeInTheDocument()
  })

  it('a failed restore says so and keeps the button', async () => {
    server.use(
      http.post('/api/products/:id/generate-description', () =>
        HttpResponse.json({
          productId: 1,
          description: 'New',
          tags: [],
          seoTitle: 's',
          model: null,
          generatedAt: '2026-10-08T10:00:00Z',
          promptTokens: null,
          completionTokens: null,
        }),
      ),
      boom('/api/products/:id', 'put'),
    )
    const user = userEvent.setup()
    renderRoute('/admin/products/1', { signedInAs: 'ADMIN' })

    await user.click(await screen.findByRole('button', { name: 'Write a description' }))
    await user.click(screen.getByRole('button', { name: 'Write and replace' }))
    await user.click(await screen.findByRole('button', { name: 'Restore previous' }))
    expect(await screen.findByText('The server fell over.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restore previous' })).toBeInTheDocument()
  })

  it('a replay that fails shows its reason and can be dismissed', async () => {
    server.use(
      http.get('/api/admin/dead-letters', () =>
        HttpResponse.json([
          {
            topic: 't.DLT',
            partition: 0,
            offset: 1,
            key: 'k',
            timestamp: '2026-10-08T10:00:00Z',
            originalTopic: 't',
            exceptionClass: 'E',
            exceptionMessage: 'm',
            payload: '{}',
            replayed: false,
          },
        ]),
      ),
      http.get('/api/admin/dead-letters/replays', () => HttpResponse.json([])),
      boom('/api/admin/dead-letters/:topic/:partition/:offset/replay', 'post'),
    )
    const user = userEvent.setup()
    renderRoute('/admin/dead-letters', { signedInAs: 'ADMIN' })

    await user.click(await screen.findByRole('button', { name: 'Replay offset 1 from t' }))
    await user.click(screen.getByRole('button', { name: 'Replay' }))
    expect(await screen.findByText(SERVER_ERROR_CORRELATION_ID)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText('The server fell over.')).not.toBeInTheDocument()
  })

  it('a stock level that fails to save is not the end of the list', async () => {
    server.use(
      http.get('/api/inventory', () =>
        HttpResponse.json(productFixtures.map((p) => ({ productId: p.id, quantity: 1 }))),
      ),
      boom('/api/inventory/:id', 'put'),
    )
    const user = userEvent.setup()
    renderRoute('/admin/stock', { signedInAs: 'ADMIN' })

    await user.type(await screen.findByLabelText('New level for Test Kettle'), '5')
    await user.keyboard('{Enter}')
    expect(await screen.findByText(new RegExp(SERVER_ERROR_CORRELATION_ID))).toBeInTheDocument()
  })
})

describe('the import page', () => {
  it('forgets the file when the choice is cleared', async () => {
    const user = userEvent.setup()
    renderRoute('/admin/import', { signedInAs: 'ADMIN' })

    const input = await screen.findByLabelText('CSV file')
    await user.upload(input, new File(['name,price\nA,1'], 'x.csv', { type: 'text/csv' }))
    expect(await screen.findByText('This file cannot be imported')).toBeInTheDocument()
    fireEvent.change(input, { target: { files: [] } })
    expect(await screen.findByLabelText('CSV file')).toBeInTheDocument()
    expect(screen.queryByText('This file cannot be imported')).not.toBeInTheDocument()
  })
})

describe('the calls, when the server answers without a body', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const empty = () => new HttpResponse(null, { status: 200 })

  it.each([
    [
      'createProduct',
      () => createProduct({ name: 'A', price: 1, stockQuantity: 1 }),
      http.post('/api/products', empty),
    ],
    [
      'updateProduct',
      () => updateProduct(1, { name: 'A', price: 1, stockQuantity: 1 }),
      http.put('/api/products/1', empty),
    ],
    ['generateDescription', () => generateDescription(1), http.post('/api/products/1/generate-description', empty)],
    ['setStock', () => setStock(1, 2), http.put('/api/inventory/1', empty)],
    ['startBackfill', () => startBackfill(), http.post('/api/products/embeddings/backfill', empty)],
    ['fetchBackfill', () => fetchBackfill(1), http.get('/api/products/embeddings/backfill/1', empty)],
    ['restartImport', () => restartImport(1), http.post('/api/admin/batch/executions/1/restart', empty)],
    [
      'replayDeadLetter',
      () =>
        replayDeadLetter({
          topic: 't',
          partition: 0,
          offset: 1,
          key: '',
          timestamp: '',
          originalTopic: '',
          exceptionClass: '',
          exceptionMessage: '',
          payload: '',
          replayed: false,
        }),
      http.post('/api/admin/dead-letters/t/0/1/replay', empty),
    ],
  ])('%s says the answer was empty', async (_name, call, handler) => {
    server.use(handler)
    await expect(call()).rejects.toThrow(/answered without/)
  })

  it('lists come back empty, and nothing is asked for no products', async () => {
    server.use(
      http.get('/api/inventory', empty),
      http.get('/api/admin/dead-letters', empty),
      http.get('/api/admin/dead-letters/replays', empty),
    )
    expect(await fetchStock([1])).toEqual([])
    expect(await fetchStock([])).toEqual([])
    expect(await fetchDeadLetters()).toEqual([])
    expect(await fetchReplays()).toEqual([])
  })

  it('deleting a product resolves with nothing', async () => {
    server.use(http.delete('/api/products/1', () => new HttpResponse(null, { status: 204 })))
    await expect(deleteProduct(1)).resolves.toBeUndefined()
  })

  it('restartImport returns the new result', async () => {
    const result = { execution: { id: 1 }, inputFile: 'i', errorFile: 'e' }
    server.use(http.post('/api/admin/batch/executions/1/restart', () => HttpResponse.json(result)))
    await expect(restartImport(1)).resolves.toEqual(result)
  })

  it('importProducts sends the file and returns the result; an empty answer is an error', async () => {
    const result = { execution: { id: 1 }, inputFile: 'i', errorFile: 'e' }
    const send = vi.fn(() => Promise.resolve(Response.json(result)))
    vi.stubGlobal('fetch', send)
    const file = new File(['x'], 'x.csv')
    await expect(importProducts(file)).resolves.toEqual(result)
    expect(send).toHaveBeenCalledOnce()
    expect(new URL((send.mock.calls[0] as unknown as [Request])[0].url).pathname).toBe(
      '/api/admin/batch/product-import',
    )

    vi.stubGlobal('fetch', () => Promise.resolve(new Response(null, { status: 200 })))
    await expect(importProducts(file)).rejects.toThrow(/answered without/)
  })
})
