import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AssistantMessage } from './AssistantMessage'

describe('AssistantMessage', () => {
  it('says who is talking when it is the assistant, and not when it is the customer', () => {
    const { rerender } = render(<AssistantMessage>Hello.</AssistantMessage>)
    expect(screen.getByText('Shop assistant')).toBeInTheDocument()

    rerender(<AssistantMessage role="user">Hello.</AssistantMessage>)
    expect(screen.queryByText('Shop assistant')).not.toBeInTheDocument()
    expect(screen.getByText('Hello.')).toBeInTheDocument()
  })

  it('shows a proposal and acts only when the customer presses Add it', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onDismiss = vi.fn()
    render(
      <AssistantMessage
        proposal={{ name: 'Test Kettle', price: 1299, quantity: 2 }}
        onConfirm={onConfirm}
        onDismiss={onDismiss}
      >
        Try this one.
      </AssistantMessage>,
    )

    expect(screen.getByText('Test Kettle')).toBeInTheDocument()
    expect(screen.getByText('₹1,299.00')).toBeInTheDocument()
    expect(screen.getByText(/add 2 to your cart\?/)).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Add it' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Not now' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('proposes one by default', () => {
    render(<AssistantMessage proposal={{ name: 'Thing', price: 10 }}>x</AssistantMessage>)

    expect(screen.getByText(/add 1 to your cart\?/)).toBeInTheDocument()
  })

  it('lists what the assistant checked', () => {
    render(<AssistantMessage sources={['catalogue', 'stock']}>x</AssistantMessage>)

    expect(screen.getByText('Checked: catalogue, stock')).toBeInTheDocument()
  })
})
