import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Price } from './Price'

describe('Price', () => {
  it.each([
    [1299, '₹1,299.00'],
    [125000.5, '₹1,25,000.50'],
    [32999, '₹32,999.00'],
  ])('shows %s in rupees with Indian digit grouping: %s', (amount, text) => {
    render(<Price amount={amount} />)

    expect(screen.getByText(text)).toBeInTheDocument()
  })

  it('shows a previous price struck through', () => {
    render(<Price amount={7499} compareAt={8999} />)

    expect(screen.getByText('₹8,999.00').tagName).toBe('S')
    expect(screen.getByText('₹7,499.00')).toBeInTheDocument()
  })

  it('has three sizes', () => {
    const { container, rerender } = render(<Price amount={1} />)
    expect(container.firstChild).toHaveClass('ed-price--md')

    rerender(<Price amount={1} size="sm" />)
    expect(container.firstChild).toHaveClass('ed-price--sm')

    rerender(<Price amount={1} size="lg" />)
    expect(container.firstChild).toHaveClass('ed-price--lg')
  })
})
