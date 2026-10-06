import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Alert } from './Alert'

describe('Alert', () => {
  it('announces a danger alert at once, as an alert', () => {
    render(<Alert tone="danger" title="We could not load the products" />)

    expect(screen.getByRole('alert')).toHaveTextContent('We could not load the products')
  })

  it.each(['info', 'success', 'warning'] as const)('announces a %s alert politely, as a status', (tone) => {
    render(<Alert tone={tone} title="Heads up" />)

    expect(screen.getByRole('status')).toHaveTextContent('Heads up')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('is info by default, with a title and detail', () => {
    render(<Alert title="Title">Detail.</Alert>)

    expect(screen.getByRole('status')).toHaveClass('ed-alert--info')
    expect(screen.getByRole('status')).toHaveTextContent('Detail.')
  })

  it('can be dismissed, only if it is given a way to', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { rerender } = render(<Alert title="x" />)
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument()

    rerender(<Alert title="x" onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
