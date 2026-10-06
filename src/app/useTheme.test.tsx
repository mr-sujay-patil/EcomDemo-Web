import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeToggle } from './ThemeToggle'
import { THEME_KEY } from './useTheme'

const root = document.documentElement

beforeEach(() => {
  localStorage.clear()
  delete root.dataset.theme
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the theme', () => {
  it('follows the system until the user chooses: no data-theme, and the button says Auto', () => {
    render(<ThemeToggle />)

    expect(root.dataset.theme).toBeUndefined()
    expect(screen.getByRole('button', { name: 'Theme: Auto. Switch to light.' })).toHaveTextContent('Theme: Auto')
  })

  it('steps through Light, Dark and back to Auto, setting data-theme on <html>', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button'))
    expect(root.dataset.theme).toBe('light')
    expect(screen.getByRole('button')).toHaveTextContent('Theme: Light')

    await user.click(screen.getByRole('button'))
    expect(root.dataset.theme).toBe('dark')
    expect(screen.getByRole('button')).toHaveTextContent('Theme: Dark')

    await user.click(screen.getByRole('button'))
    expect(root.dataset.theme).toBeUndefined()
    expect(screen.getByRole('button')).toHaveTextContent('Theme: Auto')
  })

  it('remembers a choice in this browser, and forgets it when back on Auto', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button'))
    expect(localStorage.getItem(THEME_KEY)).toBe('light')
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('button'))

    expect(localStorage.getItem(THEME_KEY)).toBeNull()
  })

  it('opens on the remembered choice', () => {
    localStorage.setItem(THEME_KEY, 'dark')

    render(<ThemeToggle />)

    expect(root.dataset.theme).toBe('dark')
    expect(screen.getByRole('button')).toHaveTextContent('Theme: Dark')
  })

  it('ignores a stored value it does not know', () => {
    localStorage.setItem(THEME_KEY, 'purple')

    render(<ThemeToggle />)

    expect(root.dataset.theme).toBeUndefined()
  })

  it('still works when the browser will not let the page store anything', async () => {
    const user = userEvent.setup()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button'))

    expect(root.dataset.theme).toBe('light')
  })
})
