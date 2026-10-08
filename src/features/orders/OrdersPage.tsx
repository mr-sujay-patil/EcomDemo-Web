import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { usePageTitle } from '@/app/pageTitle'
import { Button, buttonClass } from '@/components/Button'
import { ErrorPanel } from '@/components/ErrorPanel'
import { StatusBadge } from '@/components/StatusBadge'
import { orderKeys } from '@/features/checkout/api'
import { fetchOrders, type Order } from '@/features/checkout/orders'
import { formatPrice } from '@/lib/money'
import './orders.css'

export const PAGE_SIZE = 10

// ISO-8601 UTC in, the browser's own time zone out.
const when = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
const placed = (iso: string) => (Number.isNaN(Date.parse(iso)) ? iso : when.format(new Date(iso)))

/** Newest first. The ids only grow, so they break a tie between two orders placed in the same second. */
export function newestFirst(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt) || b.id - a.id)
}

/** The number of pieces, not of lines: three kettles are three items. */
const itemCount = (order: Order) => order.items.reduce((sum, item) => sum + item.quantity, 0)

export function OrdersPage() {
  usePageTitle('Your orders')
  const orders = useQuery({ queryKey: orderKeys.list(), queryFn: ({ signal }) => fetchOrders(signal) })
  const [page, setPage] = useState(0)
  const sorted = useMemo(() => newestFirst(orders.data ?? []), [orders.data])
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  // The list can shrink under the reader (a refetch): never show a page that no longer exists.
  const at = Math.min(page, pages - 1)
  const shown = sorted.slice(at * PAGE_SIZE, (at + 1) * PAGE_SIZE)

  return (
    <div className="stack">
      <h1>Your orders</h1>
      {orders.isError ? <ErrorPanel error={orders.error} onRetry={() => void orders.refetch()} /> : null}
      {orders.isPending ? (
        <div className="reserve-sm">
          <p role="status">Loading your orders…</p>
        </div>
      ) : null}
      {orders.data && sorted.length === 0 ? (
        <div className="stack">
          <p className="ed-title">You have not placed an order yet</p>
          <p className="ed-caption">Orders you place show up here, newest first.</p>
          <Link to="/" className={buttonClass({ variant: 'secondary' })}>
            <span>Browse the shelf</span>
          </Link>
        </div>
      ) : null}
      {shown.length > 0 ? (
        <>
          <div className="orders-scroll">
            <table className="orders-table">
              <caption className="visually-hidden">Your orders, newest first</caption>
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Placed</th>
                  <th scope="col" className="orders-num">
                    Items
                  </th>
                  <th scope="col" className="orders-num">
                    Total
                  </th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((order) => (
                  <tr key={order.id}>
                    <th scope="row" className="orders-id">
                      <Link to={`/orders/${order.id}`} aria-label={`Order ${order.id}`}>{`#${order.id}`}</Link>
                    </th>
                    <td>{placed(order.placedAt)}</td>
                    <td className="orders-num">{itemCount(order)}</td>
                    <td className="orders-num orders-money">{formatPrice(order.totalAmount)}</td>
                    <td>
                      <StatusBadge status={order.status} />
                      {order.status === 'CANCELLED' && order.statusReason ? (
                        <p className="ed-caption orders-reason">{order.statusReason}</p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 ? (
            <nav className="orders-pager" aria-label="Pages of orders">
              <Button variant="secondary" disabled={at === 0} onClick={() => setPage(at - 1)}>
                Newer
              </Button>
              <span className="ed-caption" aria-live="polite">{`Page ${at + 1} of ${pages}`}</span>
              <Button variant="secondary" disabled={at >= pages - 1} onClick={() => setPage(at + 1)}>
                Older
              </Button>
            </nav>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
