import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StaffNote } from './StaffNote'

describe('StaffNote', () => {
  it('renders the words with the name, the role and the date of the person who wrote them', () => {
    render(
      <StaffNote name="Test Person" role="Owner" date="1 Jan 2026">
        A sample note.
      </StaffNote>,
    )

    const note = screen.getByRole('figure')
    expect(note).toHaveTextContent('A sample note.')
    expect(screen.getByText('Test Person')).toBeInTheDocument()
    expect(screen.getByText('Owner')).toBeInTheDocument()
    expect(screen.getByText('1 Jan 2026')).toBeInTheDocument()
  })

  it('quotes the words', () => {
    const { container } = render(<StaffNote name="Test Person">Words.</StaffNote>)

    expect(container.querySelector('blockquote')).toHaveTextContent('Words.')
  })

  it('draws the initials from the name, or the ones it is given, and hides them from screen readers', () => {
    const { container, rerender } = render(<StaffNote name="Test Person">x</StaffNote>)
    expect(container.querySelector('.ed-note-initials')).toHaveTextContent('TP')
    expect(container.querySelector('.ed-note-initials')).toHaveAttribute('aria-hidden', 'true')

    rerender(
      <StaffNote name="Test Person" initials="Z">
        x
      </StaffNote>,
    )
    expect(container.querySelector('.ed-note-initials')).toHaveTextContent('Z')
  })

  it('leaves out the role and date when it has none', () => {
    const { container } = render(<StaffNote name="Test Person">x</StaffNote>)

    expect(container.querySelector('time')).not.toBeInTheDocument()
  })
})
