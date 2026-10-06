import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QuantityStepper } from './QuantityStepper'

describe('QuantityStepper', () => {
  it('is a group named Quantity, or the name it is given', () => {
    const { rerender } = render(<QuantityStepper />)
    expect(screen.getByRole('group', { name: 'Quantity' })).toBeInTheDocument()

    rerender(<QuantityStepper label="Quantity of Test Kettle" />)
    expect(screen.getByRole('group', { name: 'Quantity of Test Kettle' })).toBeInTheDocument()
  })

  it('counts up and down on its own', async () => {
    const user = userEvent.setup()
    render(<QuantityStepper defaultValue={2} />)

    await user.click(screen.getByRole('button', { name: 'Increase' }))
    expect(screen.getByRole('status')).toHaveTextContent('3')
    await user.click(screen.getByRole('button', { name: 'Decrease' }))
    await user.click(screen.getByRole('button', { name: 'Decrease' }))
    expect(screen.getByRole('status')).toHaveTextContent('1')
  })

  it('disables Decrease at the minimum', () => {
    render(<QuantityStepper defaultValue={1} />)

    expect(screen.getByRole('button', { name: 'Decrease' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Increase' })).toBeEnabled()
  })

  it('disables Increase at the maximum, for example the stock', async () => {
    const user = userEvent.setup()
    render(<QuantityStepper defaultValue={3} max={4} />)

    await user.click(screen.getByRole('button', { name: 'Increase' }))

    expect(screen.getByRole('status')).toHaveTextContent('4')
    expect(screen.getByRole('button', { name: 'Increase' })).toBeDisabled()
  })

  it('reports each change, within the limits', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<QuantityStepper defaultValue={5} min={5} max={6} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Increase' }))

    expect(onChange).toHaveBeenCalledWith(6)
  })

  it('is controlled when it has a value: the parent decides what is shown', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<QuantityStepper value={2} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Increase' }))

    expect(onChange).toHaveBeenCalledWith(3)
    expect(screen.getByRole('status')).toHaveTextContent('2')
  })
})
