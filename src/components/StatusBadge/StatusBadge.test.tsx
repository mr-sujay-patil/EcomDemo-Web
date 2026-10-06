import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge, type OrderStatus } from './StatusBadge'

describe('StatusBadge', () => {
  it.each([
    ['PENDING', 'Pending', 'accent'],
    ['CONFIRMED', 'Confirmed', 'success'],
    ['CANCELLED', 'Cancelled', 'danger'],
  ] as [OrderStatus, string, string][])('shows %s as the word "%s", not as a colour alone', (status, word, tone) => {
    render(<StatusBadge status={status} />)

    expect(screen.getByText(word)).toHaveClass('ed-badge', `ed-badge--${tone}`)
  })

  it('shows its own words and tone when it is not an order status', () => {
    render(<StatusBadge tone="brand">Draft</StatusBadge>)

    expect(screen.getByText('Draft')).toHaveClass('ed-badge--brand')
  })

  it('is neutral when it has neither', () => {
    render(<StatusBadge>Plain</StatusBadge>)

    expect(screen.getByText('Plain')).toHaveClass('ed-badge--neutral')
  })
})
