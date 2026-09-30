import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { productHandlers, SERVER_ERROR_CORRELATION_ID } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/render'
import { ProductListPage } from './ProductListPage'

/** The list item that holds the product with this name. */
async function findProductItem(name: string) {
  const heading = await screen.findByRole('heading', { name })
  const item = screen.getAllByRole('listitem').find((li) => li.contains(heading))
  if (!item) throw new Error(`No list item holds the product "${name}"`)
  return item
}

describe('ProductListPage', () => {
  it('shows a loading message, then the products', async () => {
    renderWithProviders(<ProductListPage />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading products…')

    expect(await screen.findByRole('heading', { name: 'Test Kettle' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('formats prices in rupees with Indian digit grouping', async () => {
    renderWithProviders(<ProductListPage />)

    expect(within(await findProductItem('Test Kettle')).getByText('₹1,299.00')).toBeInTheDocument()
    expect(within(await findProductItem('Test Sofa')).getByText('₹1,25,000.50')).toBeInTheDocument()
  })

  it('shows "Other" for a product without a category', async () => {
    renderWithProviders(<ProductListPage />)

    expect(within(await findProductItem('Test Gift Card')).getByText('Category: Other')).toBeInTheDocument()
    expect(within(await findProductItem('Test Kettle')).getByText('Category: Kitchen')).toBeInTheDocument()
  })

  it('says so when there are no products', async () => {
    server.use(productHandlers.empty)
    renderWithProviders(<ProductListPage />)

    expect(await screen.findByText('No products yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('shows the server’s error message and the correlation id on a 500', async () => {
    server.use(productHandlers.serverError)
    renderWithProviders(<ProductListPage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The catalogue is unavailable right now.')
    expect(alert).toHaveTextContent(SERVER_ERROR_CORRELATION_ID)
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
    renderWithProviders(<ProductListPage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Could not reach the server. Check your connection and try again.')
    expect(sentId).toMatch(/^[0-9a-f-]{36}$/)
    expect(within(alert).getByText(sentId)).toBeInTheDocument()
  })
})
