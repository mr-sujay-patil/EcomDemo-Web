import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProductCard } from './ProductCard'

const base = { name: 'Test Kettle', price: 1299 }

describe('ProductCard', () => {
  it('shows the name as a heading (level 3 unless told), the price, the category and the description', () => {
    render(<ProductCard {...base} category="Kitchen" description="Boils water." />)

    expect(screen.getByRole('heading', { level: 3, name: 'Test Kettle' })).toBeInTheDocument()
    expect(screen.getByText('₹1,299.00')).toBeInTheDocument()
    expect(screen.getByText('Kitchen')).toBeInTheDocument()
    expect(screen.getByText('Boils water.')).toBeInTheDocument()
  })

  it('can use level 2, for a page whose h1 is followed straight by cards', () => {
    render(<ProductCard {...base} headingLevel={2} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Test Kettle' })).toBeInTheDocument()
  })

  it('has no SKU: the backend has none', () => {
    render(<ProductCard {...base} />)

    expect(screen.queryByText(/SKU/)).not.toBeInTheDocument()
  })

  it.each([
    [25, '25 in stock', 'ed-stock is-in'],
    [5, 'Only 5 left', 'ed-stock is-low'],
    [1, 'Only 1 left', 'ed-stock is-low'],
    [0, 'Out of stock', 'ed-stock is-out'],
  ])('says stock %s as "%s"', (stock, words, classes) => {
    render(<ProductCard {...base} stock={stock} />)

    expect(screen.getByText(words)).toHaveClass(...classes.split(' '))
  })

  it('says nothing about stock when it is not given', () => {
    render(<ProductCard {...base} />)

    expect(screen.queryByText(/in stock|left|Out of stock/)).not.toBeInTheDocument()
  })

  it('has an Add to cart button only where adding is possible, and it works', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    const { rerender } = render(<ProductCard {...base} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()

    rerender(<ProductCard {...base} onAdd={onAdd} />)
    await user.click(screen.getByRole('button', { name: 'Add to cart' }))

    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('disables the button at stock 0 and says so', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<ProductCard {...base} stock={0} onAdd={onAdd} />)

    const button = screen.getByRole('button', { name: 'Out of stock' })
    await user.click(button)

    expect(button).toBeDisabled()
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('says how many are in the cart already', () => {
    render(<ProductCard {...base} stock={9} inCart={2} onAdd={() => undefined} />)

    expect(screen.getByRole('button', { name: 'In your cart (2)' })).toHaveClass('ed-btn--secondary')
  })

  it('lets the page wrap the name, for a link', () => {
    render(<ProductCard {...base} renderName={(name) => <a href="/products/1">{name}</a>} />)

    expect(screen.getByRole('link', { name: 'Test Kettle' })).toHaveAttribute('href', '/products/1')
    expect(screen.getByRole('heading', { name: 'Test Kettle' })).toContainElement(screen.getByRole('link'))
  })

  it('shows its image, or the "Photo to come" well without one', () => {
    const { rerender } = render(<ProductCard {...base} image="/api/products/1/image" />)
    expect(screen.getByRole('img', { name: 'Test Kettle' })).toHaveAttribute('src', '/api/products/1/image')

    rerender(<ProductCard {...base} image={null} />)
    expect(screen.getByText('Photo to come')).toBeInTheDocument()
  })
})
