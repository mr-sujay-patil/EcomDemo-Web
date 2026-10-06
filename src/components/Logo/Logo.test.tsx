import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Logo } from './Logo'

describe('Logo', () => {
  it('is an image named EcomDemo', () => {
    render(<Logo />)

    expect(screen.getByRole('img', { name: 'EcomDemo' })).toBeInTheDocument()
  })

  it('keeps the proportions when the height changes', () => {
    render(<Logo height={56} />)
    const full = screen.getByRole('img', { name: 'EcomDemo' })

    expect(full).toHaveAttribute('height', '56')
    expect(Number(full.getAttribute('width'))).toBeGreaterThan(56)
  })

  it('draws the tag alone as the mark, which is narrower than the full logo', () => {
    const { container, rerender } = render(<Logo />)
    const fullWidth = Number(container.querySelector('svg')?.getAttribute('width'))
    expect(container.querySelector('.ed-logo-ink')).toBeInTheDocument()

    rerender(<Logo variant="mark" />)

    expect(container.querySelector('.ed-logo-ink')).not.toBeInTheDocument()
    expect(Number(container.querySelector('svg')?.getAttribute('width'))).toBeLessThan(fullWidth)
  })
})
