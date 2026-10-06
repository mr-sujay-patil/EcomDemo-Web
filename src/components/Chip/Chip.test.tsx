import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Chip } from './Chip'

describe('Chip', () => {
  it('is a toggle button: aria-pressed says whether it is on', () => {
    const { rerender } = render(<Chip>Audio</Chip>)
    expect(screen.getByRole('button', { name: 'Audio' })).toHaveAttribute('aria-pressed', 'false')

    rerender(<Chip selected>Audio</Chip>)
    expect(screen.getByRole('button', { name: 'Audio' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('is named with its count, as a person reads it: "Audio 7"', () => {
    render(<Chip count={7}>Audio</Chip>)

    expect(screen.getByRole('button', { name: 'Audio 7' })).toBeInTheDocument()
  })

  it('shows a count of zero', () => {
    render(<Chip count={0}>Audio</Chip>)

    expect(screen.getByRole('button', { name: 'Audio 0' })).toBeInTheDocument()
  })

  it('calls onClick', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Chip onClick={onClick}>Audio</Chip>)

    await user.click(screen.getByRole('button', { name: 'Audio' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
