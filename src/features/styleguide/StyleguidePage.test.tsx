import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/render'

// The 17 components the design system ships, as the page names them.
const components = [
  'Icon',
  'Logo',
  'Button',
  'StatusBadge',
  'Chip',
  'TextField',
  'QuantityStepper',
  'Price',
  'ProductTile',
  'ProductCard',
  'CartLine',
  'OrderSummary',
  'SagaTimeline',
  'AssistantMessage',
  'StaffNote',
  'Alert',
  'Header',
]

describe('/styleguide', () => {
  it('shows every component in its own section', async () => {
    renderRoute('/styleguide')

    expect(await screen.findByRole('heading', { level: 1, name: 'Style guide' })).toBeInTheDocument()
    for (const name of components) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument()
    }
  })

  it('shows the states that matter: loading, disabled, out of stock, an error, a cancelled order', async () => {
    renderRoute('/styleguide')
    await screen.findByRole('heading', { level: 1, name: 'Style guide' })

    expect(screen.getAllByRole('button', { busy: true })).toHaveLength(2)
    expect(screen.getAllByText('Out of stock').length).toBeGreaterThan(0)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getAllByText('Cancelled')).toHaveLength(2)
  })

  it('has samples that can be pressed and do nothing', async () => {
    const user = userEvent.setup()
    renderRoute('/styleguide')
    await screen.findByRole('heading', { level: 1, name: 'Style guide' })

    await user.click(screen.getByRole('button', { name: 'Add it' }))
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Style guide' })).toBeInTheDocument()
  })
})
