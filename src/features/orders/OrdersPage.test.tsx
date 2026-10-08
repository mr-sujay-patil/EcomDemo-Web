import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { orderFixture } from '@/test/msw/orders'
import { server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'
import { newestFirst, PAGE_SIZE } from './OrdersPage'

const serve = (orders: ReturnType<typeof orderFixture>[]) =>
  server.use(http.get('/api/orders', () => HttpResponse.json(orders)))
const rowIds = () =>
  within(screen.getByRole('table'))
    .getAllByRole('rowheader')
    .map((cell) => cell.textContent)

describe('newestFirst', () => {
  it('orders by placed time, then by id, without touching the input', () => {
    const a = orderFixture({ id: 1, placedAt: '2026-10-01T10:00:00Z' })
    const b = orderFixture({ id: 2, placedAt: '2026-10-03T10:00:00Z' })
    const c = orderFixture({ id: 3, placedAt: '2026-10-03T10:00:00Z' })
    const input = [a, b, c]
    expect(newestFirst(input).map((order) => order.id)).toEqual([3, 2, 1])
    expect(input.map((order) => order.id)).toEqual([1, 2, 3])
  })
})

describe('my orders', () => {
  it('lists the orders newest first with id, date, item count, total and status', async () => {
    serve([
      orderFixture({ id: 1, placedAt: '2026-10-01T10:00:00Z', status: 'CONFIRMED', totalAmount: 100 }),
      orderFixture({
        id: 2,
        placedAt: '2026-10-02T10:00:00Z',
        status: 'CANCELLED',
        statusReason: 'Insufficient stock for Test Kettle',
        totalAmount: 2598,
        items: [{ productId: 1, productName: 'Test Kettle', unitPrice: 1299, quantity: 2, lineTotal: 2598 }],
      }),
    ])
    renderRoute('/orders', { signedInAs: 'CUSTOMER' })

    expect(await screen.findByRole('table', { name: 'Your orders, newest first' })).toBeInTheDocument()
    expect(rowIds()).toEqual(['#2', '#1'])
    const first = within(screen.getAllByRole('row')[1]!)
    expect(first.getByText('2')).toBeInTheDocument() // two kettles are two items
    expect(first.getByText('₹2,598.00')).toBeInTheDocument()
    // The status is rendered for a wide and for a narrow layout (CSS shows one); jsdom has no CSS, so both are here.
    expect(first.getAllByText('Cancelled')).toHaveLength(2)
    expect(first.getAllByText('Insufficient stock for Test Kettle')).toHaveLength(2)
    expect(within(screen.getAllByRole('row')[2]!).queryByText(/Insufficient/)).not.toBeInTheDocument()
  })

  it('opens an order from its id', async () => {
    serve([orderFixture({ id: 7 })])
    const user = userEvent.setup()
    const { router } = renderRoute('/orders', { signedInAs: 'CUSTOMER' })

    await user.click(await screen.findByRole('link', { name: 'Order 7' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/orders/7'))
  })

  it('pages the list client-side', async () => {
    const orders = Array.from({ length: PAGE_SIZE + 3 }, (_, index) =>
      orderFixture({ id: index + 1, placedAt: `2026-10-01T10:${String(index).padStart(2, '0')}:00Z` }),
    )
    serve(orders)
    const user = userEvent.setup()
    renderRoute('/orders', { signedInAs: 'CUSTOMER' })

    await screen.findByRole('table')
    expect(rowIds()).toHaveLength(PAGE_SIZE)
    expect(rowIds()[0]).toBe(`#${PAGE_SIZE + 3}`)
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Newer' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Older' }))

    expect(rowIds()).toEqual(['#3', '#2', '#1'])
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Older' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Newer' }))

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(rowIds()[0]).toBe(`#${PAGE_SIZE + 3}`)
  })

  it('shows no pager for one page', async () => {
    serve([orderFixture({ id: 1 })])
    renderRoute('/orders', { signedInAs: 'CUSTOMER' })
    await screen.findByRole('table')
    expect(screen.queryByRole('navigation', { name: 'Pages of orders' })).not.toBeInTheDocument()
  })

  it('shows a date it cannot read as the server sent it', async () => {
    serve([orderFixture({ id: 3, placedAt: 'last Tuesday' })])
    renderRoute('/orders', { signedInAs: 'CUSTOMER' })

    expect(await screen.findByText('last Tuesday')).toBeInTheDocument()
  })

  it('has an empty state', async () => {
    serve([])
    renderRoute('/orders', { signedInAs: 'CUSTOMER' })

    expect(await screen.findByText('You have not placed an order yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse the shelf' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows a load error with Retry', async () => {
    server.use(
      http.get('/api/orders', () =>
        HttpResponse.json({ status: 500, message: 'Orders are unavailable' }, { status: 500 }),
      ),
    )
    renderRoute('/orders', { signedInAs: 'CUSTOMER' })

    expect(await screen.findByText(/Orders are unavailable/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry|try again/i })).toBeInTheDocument()
  })

  it('asks again when Retry is pressed', async () => {
    let asked = 0
    server.use(
      http.get('/api/orders', () => {
        asked += 1
        return asked === 1
          ? HttpResponse.json({ status: 500, message: 'Orders are unavailable' }, { status: 500 })
          : HttpResponse.json([orderFixture({ id: 5 })])
      }),
    )
    const user = userEvent.setup()
    renderRoute('/orders', { signedInAs: 'CUSTOMER' })

    await user.click(await screen.findByRole('button', { name: /retry|try again/i }))

    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(rowIds()).toEqual(['#5'])
  })
})
