import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrderSummary } from './OrderSummary'

describe('OrderSummary', () => {
  it('is a region named Order summary, with the server’s total', () => {
    render(<OrderSummary total={26497} />)

    const region = screen.getByRole('region', { name: 'Order summary' })
    expect(within(region).getByText('Total')).toBeInTheDocument()
    expect(within(region).getByText('₹26,497.00')).toBeInTheDocument()
  })

  it('shows only the rows the server sent', () => {
    render(<OrderSummary total={100} />)

    expect(screen.queryByText(/Subtotal/)).not.toBeInTheDocument()
    expect(screen.queryByText('Shipping')).not.toBeInTheDocument()
    expect(screen.queryByText('Discount')).not.toBeInTheDocument()
  })

  it('shows subtotal with the item count, shipping, and discount', () => {
    render(<OrderSummary subtotal={26997} shipping={150} discount={500} total={26647} itemCount={3} />)

    expect(screen.getByText('Subtotal (3 items)')).toBeInTheDocument()
    expect(screen.getByText('₹26,997.00')).toBeInTheDocument()
    expect(screen.getByText('₹150.00')).toBeInTheDocument()
    expect(screen.getByText('− ₹500.00')).toBeInTheDocument()
  })

  it('says one item in the singular and free shipping in words', () => {
    render(<OrderSummary subtotal={10} shipping={0} total={10} itemCount={1} />)

    expect(screen.getByText('Subtotal (1 item)')).toBeInTheDocument()
    expect(screen.getByText('Free')).toBeInTheDocument()
  })

  it('never adds the rows up: the total is the server’s', () => {
    render(<OrderSummary subtotal={100} shipping={50} discount={20} total={999} />)

    expect(screen.getByText('₹999.00')).toBeInTheDocument()
    expect(screen.queryByText('₹130.00')).not.toBeInTheDocument()
  })

  it('has a call to action that works, in the words it is given', async () => {
    const user = userEvent.setup()
    const onCheckout = vi.fn()
    render(<OrderSummary total={1} cta="Pay now" onCheckout={onCheckout} />)

    await user.click(screen.getByRole('button', { name: 'Pay now' }))

    expect(onCheckout).toHaveBeenCalledTimes(1)
  })

  it('says Place order by default, and disables the button while loading', () => {
    const { rerender } = render(<OrderSummary total={1} />)
    expect(screen.getByRole('button', { name: 'Place order' })).toBeEnabled()

    rerender(<OrderSummary total={1} loading />)
    expect(screen.getByRole('button', { name: 'Place order' })).toBeDisabled()
  })
})
