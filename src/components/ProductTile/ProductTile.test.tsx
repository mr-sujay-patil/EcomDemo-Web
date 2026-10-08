import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProductTile } from './ProductTile'

describe('ProductTile', () => {
  it('says "Photo to come" when there is no image, and hides the well from screen readers', () => {
    const { container } = render(<ProductTile category="AUDIO" />)

    expect(screen.getByText('Photo to come')).toBeInTheDocument()
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('treats a null image as no image (the API sends null for a product without one)', () => {
    render(<ProductTile image={null} />)

    expect(screen.getByText('Photo to come')).toBeInTheDocument()
  })

  it('shows the image, described by the product name', () => {
    render(<ProductTile image="/api/products/1/image" alt="Test Kettle" />)

    const photo = screen.getByRole('img', { name: 'Test Kettle' })
    expect(photo).toHaveAttribute('src', '/api/products/1/image')
    expect(screen.queryByText('Photo to come')).not.toBeInTheDocument()
  })

  it("loads a card's photo lazily, and a page's main photo at once and first", () => {
    const { rerender } = render(<ProductTile image="/api/products/1/image" alt="Test Kettle" />)

    expect(screen.getByRole('img', { name: 'Test Kettle' })).toHaveAttribute('loading', 'lazy')
    expect(screen.getByRole('img', { name: 'Test Kettle' })).not.toHaveAttribute('fetchpriority')

    rerender(<ProductTile image="/api/products/1/image" alt="Test Kettle" priority />)

    expect(screen.getByRole('img', { name: 'Test Kettle' })).toHaveAttribute('loading', 'eager')
    expect(screen.getByRole('img', { name: 'Test Kettle' })).toHaveAttribute('fetchpriority', 'high')
  })

  it('falls back to the well when the image fails to load', () => {
    render(<ProductTile image="/api/products/1/image" alt="Test Kettle" />)

    fireEvent.error(screen.getByRole('img', { name: 'Test Kettle' }))

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Photo to come')).toBeInTheDocument()
  })

  it('gives a different image its own chance after one failed', () => {
    const { rerender } = render(<ProductTile image="/api/products/1/image" alt="Kettle" />)
    fireEvent.error(screen.getByRole('img'))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()

    rerender(<ProductTile image="/api/products/2/image" alt="Sofa" />)

    expect(screen.getByRole('img', { name: 'Sofa' })).toBeInTheDocument()
  })

  it('draws the small size without the words', () => {
    render(<ProductTile category="STORAGE" size="sm" />)

    expect(screen.queryByText('Photo to come')).not.toBeInTheDocument()
  })

  it.each(['PERIPHERALS', 'audio', 'Something else', undefined])('copes with the category %s', (category) => {
    const { container } = render(<ProductTile category={category} />)

    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
