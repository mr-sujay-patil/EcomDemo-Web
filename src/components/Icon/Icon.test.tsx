import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Icon } from './Icon'
import { ICONS, type IconName } from './icons'

describe('Icon', () => {
  it('is hidden from screen readers unless it has a label', () => {
    const { container } = render(<Icon name="cart" />)

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('becomes an image with a name when it has a label', () => {
    render(<Icon name="cart" label="Cart" />)

    expect(screen.getByRole('img', { name: 'Cart' })).toBeInTheDocument()
  })

  it('takes a size in px, 20 by default', () => {
    const { container, rerender } = render(<Icon name="check" />)
    expect(container.querySelector('svg')).toHaveAttribute('width', '20')

    rerender(<Icon name="check" size={32} />)
    expect(container.querySelector('svg')).toHaveAttribute('height', '32')
  })

  it.each(Object.keys(ICONS) as IconName[])('draws %s', (name) => {
    const { container } = render(<Icon name={name} />)

    expect(container.querySelector('svg')?.children.length).toBeGreaterThan(0)
  })

  it('has the 21 icons drawn for the system', () => {
    expect(Object.keys(ICONS)).toHaveLength(21)
  })
})
