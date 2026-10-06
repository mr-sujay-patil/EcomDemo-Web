import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { buttonClass } from './buttonClass'

describe('Button', () => {
  it('is a button with its words, primary and medium by default', () => {
    render(<Button>Place order</Button>)

    expect(screen.getByRole('button', { name: 'Place order' })).toHaveClass('ed-btn', 'ed-btn--primary', 'ed-btn--md')
  })

  it('does not submit a form unless it is told to', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((event: React.FormEvent) => {
      event.preventDefault()
    })
    render(
      <form onSubmit={onSubmit}>
        <Button>Plain</Button>
        <Button type="submit">Send</Button>
      </form>,
    )

    await user.click(screen.getByRole('button', { name: 'Plain' }))
    expect(onSubmit).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it.each(['secondary', 'ghost', 'danger'] as const)('has a %s variant', (variant) => {
    render(<Button variant={variant}>Go</Button>)

    expect(screen.getByRole('button')).toHaveClass(`ed-btn--${variant}`)
  })

  it('calls onClick, and not when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const { rerender } = render(<Button onClick={onClick}>Go</Button>)
    await user.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    )
    await user.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('while loading is disabled, says it is busy, and shows a spinner', () => {
    const { container } = render(<Button loading>Place order</Button>)

    const button = screen.getByRole('button', { name: 'Place order' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelector('.ed-spinner')).toBeInTheDocument()
  })

  it('is icon-only without children, so it needs the label it is given', () => {
    render(<Button icon="trash" aria-label="Remove item" />)

    expect(screen.getByRole('button', { name: 'Remove item' })).toHaveClass('ed-btn--icon')
  })

  it('can carry an icon on either side, and a class of its own', () => {
    const { container } = render(
      <Button icon="cart" iconRight="chevron-right" className="mine">
        Add
      </Button>,
    )

    expect(container.querySelectorAll('svg')).toHaveLength(2)
    expect(screen.getByRole('button')).toHaveClass('mine')
  })

  it('can fill its container', () => {
    render(<Button block>Wide</Button>)

    expect(screen.getByRole('button')).toHaveClass('ed-btn--block')
  })
})

describe('buttonClass', () => {
  it('gives a link the classes of a button', () => {
    expect(buttonClass({ variant: 'secondary', size: 'sm', block: true, iconOnly: true, className: 'x' })).toBe(
      'ed-btn ed-btn--secondary ed-btn--sm ed-btn--block ed-btn--icon x',
    )
    expect(buttonClass()).toBe('ed-btn ed-btn--primary ed-btn--md')
  })
})
