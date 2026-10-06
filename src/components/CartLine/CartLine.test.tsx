import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CartLine } from './CartLine'

const line = { name: 'Test Kettle', unitPrice: 1299, lineTotal: 2598, quantity: 2 }

describe('CartLine', () => {
  it('shows the name, the price each and the line total', () => {
    render(<CartLine {...line} />)

    expect(screen.getByText('Test Kettle')).toBeInTheDocument()
    expect(screen.getByText('₹1,299.00 each')).toBeInTheDocument()
    expect(screen.getByText('₹2,598.00')).toBeInTheDocument()
  })

  it('shows the server’s line total and never works one out itself', () => {
    // 2 x 100 is 200; the server says 199 (a discount, say). The line shows what the server said.
    render(<CartLine name="Thing" unitPrice={100} lineTotal={199} quantity={2} />)

    expect(screen.getByText('₹199.00')).toBeInTheDocument()
    expect(screen.queryByText('₹200.00')).not.toBeInTheDocument()
  })

  it('names its stepper after the product, so a list of them is not a list of identical controls', () => {
    render(<CartLine {...line} />)

    expect(screen.getByRole('group', { name: 'Quantity of Test Kettle' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('2')
  })

  it('reports a change of quantity and a removal', async () => {
    const user = userEvent.setup()
    const onQuantity = vi.fn()
    const onRemove = vi.fn()
    render(<CartLine {...line} onQuantity={onQuantity} onRemove={onRemove} />)

    await user.click(screen.getByRole('button', { name: 'Increase' }))
    await user.click(screen.getByRole('button', { name: 'Remove Test Kettle' }))

    expect(onQuantity).toHaveBeenCalledWith(3)
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('stops at the stock it is given', () => {
    render(<CartLine {...line} quantity={4} max={4} />)

    expect(screen.getByRole('button', { name: 'Increase' })).toBeDisabled()
  })
})
