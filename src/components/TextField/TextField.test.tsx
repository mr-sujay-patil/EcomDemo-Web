import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TextField } from './TextField'

describe('TextField', () => {
  it('is labelled: clicking the label reaches the input', async () => {
    const user = userEvent.setup()
    render(<TextField label="Email" />)

    await user.click(screen.getByText('Email'))

    expect(screen.getByLabelText('Email')).toHaveFocus()
  })

  it('describes the input with its hint', () => {
    render(<TextField label="Password" hint="At least 8 characters." />)

    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('At least 8 characters.')
    expect(screen.getByLabelText('Password')).not.toHaveAttribute('aria-invalid')
  })

  it('shows an error instead of the hint, and marks the input invalid', () => {
    render(<TextField label="Email" hint="A hint." error="Enter an address like name@example.com." />)

    const input = screen.getByLabelText('Email')
    expect(input).toBeInvalid()
    expect(input).toHaveAccessibleDescription('Enter an address like name@example.com.')
    expect(screen.queryByText('A hint.')).not.toBeInTheDocument()
  })

  it('gives each field its own id, or uses the one it is given', () => {
    render(
      <>
        <TextField label="One" />
        <TextField label="Two" />
        <TextField label="Three" id="mine" />
      </>,
    )

    expect(screen.getByLabelText('One').id).not.toBe(screen.getByLabelText('Two').id)
    expect(screen.getByLabelText('Three')).toHaveAttribute('id', 'mine')
  })

  it('passes input props through and works without a visible label when it has an aria-label', async () => {
    const user = userEvent.setup()
    render(<TextField aria-label="Search products" icon="search" placeholder="Search" disabled={false} />)

    await user.type(screen.getByRole('textbox', { name: 'Search products' }), 'desk')

    expect(screen.getByPlaceholderText('Search')).toHaveValue('desk')
  })

  it('can be disabled', () => {
    render(<TextField label="Username" disabled />)

    expect(screen.getByLabelText('Username')).toBeDisabled()
  })
})
