import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SagaTimeline } from './SagaTimeline'

const steps = () => screen.getAllByRole('listitem')

describe('SagaTimeline', () => {
  it('is a region named Order progress with the four steps in order', () => {
    render(<SagaTimeline />)

    const region = screen.getByRole('region', { name: 'Order progress' })
    expect(
      within(region)
        .getAllByRole('listitem')
        .map((step) => step.textContent),
    ).toEqual([
      expect.stringContaining('Order placed'),
      expect.stringContaining('Stock reserved'),
      expect.stringContaining('Payment taken'),
      expect.stringContaining('Confirmed'),
    ])
  })

  it('while PENDING shows the step in progress, with words', () => {
    render(<SagaTimeline status="PENDING" current="payment" />)

    expect(steps().map((step) => step.className)).toEqual([
      'ed-step is-done',
      'ed-step is-done',
      'ed-step is-current',
      'ed-step is-todo',
    ])
    expect(within(steps()[2] as HTMLElement).getByText('In progress…')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('when CONFIRMED has every step done', () => {
    render(<SagaTimeline status="CONFIRMED" />)

    expect(steps().every((step) => step.classList.contains('is-done'))).toBe(true)
    expect(screen.getAllByText('Confirmed')).toHaveLength(2)
  })

  it('when CANCELLED marks the step that failed, with the reason, and the rest as not reached', () => {
    render(<SagaTimeline status="CANCELLED" failedAt="payment" reason="The payment was declined." />)

    expect(steps().map((step) => step.className)).toEqual([
      'ed-step is-done',
      'ed-step is-done',
      'ed-step is-failed',
      'ed-step is-skipped',
    ])
    expect(within(steps()[2] as HTMLElement).getByText('The payment was declined.')).toBeInTheDocument()
    expect(within(steps()[3] as HTMLElement).getByText('Not reached')).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
  })

  it('shows the order number and the times it is given', () => {
    render(<SagaTimeline status="CONFIRMED" orderId={1042} times={{ placed: '12:04', confirmed: '12:05' }} />)

    expect(screen.getByText('Order #1042')).toBeInTheDocument()
    expect(screen.getByText('12:04')).toBeInTheDocument()
    expect(screen.getByText('12:05')).toBeInTheDocument()
  })
})
