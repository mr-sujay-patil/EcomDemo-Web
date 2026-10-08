import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '@/test/msw/server'
import { searchHandlers } from '@/test/msw/handlers'
import { renderRoute } from '@/test/render'
import { SUGGESTION_DELAY_MS } from './SearchBox'

/** Counts the suggestion requests (limit=5) the page sends. */
function countSuggestionRequests() {
  const urls: URL[] = []
  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url)
    if (url.pathname === '/api/products/search' && url.searchParams.get('limit') === '5') urls.push(url)
  })
  return urls
}

const box = () => screen.getByRole('combobox', { name: 'Search products' })

describe('the header search box', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
  afterEach(() => {
    vi.useRealTimers()
    server.events.removeAllListeners()
  })

  function setup(path = '/about', keyDelay = 0) {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime, delay: keyDelay })
    return { user, ...renderRoute(path) }
  }

  it('sends one request for a burst of typing, after the pause', async () => {
    const requests = countSuggestionRequests()
    // 50 ms between keystrokes: faster than the 300 ms pause, so the wait restarts each time.
    const { user } = setup('/about', 50)
    await screen.findByRole('heading', { level: 1, name: 'About' })

    await user.type(box(), 'keyboard')
    expect(requests).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(SUGGESTION_DELAY_MS)
    await screen.findByRole('option', { name: /Test Gift Card/ })

    expect(requests).toHaveLength(1)
    expect(requests[0]?.searchParams.get('q')).toBe('keyboard')
  })

  it('asks for nothing until two characters are typed', async () => {
    const requests = countSuggestionRequests()
    const { user } = setup()
    await screen.findByRole('heading', { level: 1, name: 'About' })

    await user.type(box(), 'k')
    await vi.advanceTimersByTimeAsync(SUGGESTION_DELAY_MS * 2)

    expect(requests).toHaveLength(0)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('lists the suggestions in the server order, with prices, and marks the box expanded', async () => {
    const { user } = setup()
    await screen.findByRole('heading', { level: 1, name: 'About' })

    await user.type(box(), 'desk')
    const options = await screen.findAllByRole('option')

    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining('Test Gift Card'),
      expect.stringContaining('Test Sofa'),
      expect.stringContaining('Test Kettle'),
    ])
    expect(within(options[1]!).getByText('₹1,25,000.50')).toBeInTheDocument()
    expect(box()).toHaveAttribute('aria-expanded', 'true')
  })

  it('moves through the suggestions with the arrow keys and opens the highlighted product on Enter', async () => {
    const { user, router } = setup()
    await screen.findByRole('heading', { level: 1, name: 'About' })
    await user.type(box(), 'desk')
    await screen.findAllByRole('option')

    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(screen.getByRole('option', { name: /Test Sofa/ })).toHaveAttribute('aria-selected', 'true')
    expect(box()).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: /Test Sofa/ }).id)

    await user.keyboard('{Enter}')

    expect(router.state.location.pathname).toBe('/products/2')
  })

  it('wraps around with the arrow keys, and ArrowUp from the top goes to the last suggestion', async () => {
    const { user } = setup()
    await screen.findByRole('heading', { level: 1, name: 'About' })
    await user.type(box(), 'desk')
    await screen.findAllByRole('option')

    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('option', { name: /Test Kettle/ })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('option', { name: /Test Sofa/ })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(screen.getByRole('option', { name: /Test Gift Card/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('opens a suggestion that is clicked, and closes the list', async () => {
    const { user, router } = setup()
    await screen.findByRole('heading', { level: 1, name: 'About' })
    await user.type(box(), 'desk')

    await user.click(await screen.findByRole('option', { name: /Test Sofa/, hidden: true }))

    expect(router.state.location.pathname).toBe('/products/2')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('goes to /search?q=… on Enter with nothing highlighted, and closes the list', async () => {
    const { user, router } = setup()
    await screen.findByRole('heading', { level: 1, name: 'About' })
    await user.type(box(), 'something to type on')
    await screen.findAllByRole('option')

    await user.keyboard('{Enter}')

    expect(router.state.location.pathname).toBe('/search')
    expect(router.state.location.search).toBe('?q=something+to+type+on')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes the list on Escape and when focus leaves', async () => {
    const { user } = setup()
    await screen.findByRole('heading', { level: 1, name: 'About' })
    await user.type(box(), 'desk')
    await screen.findAllByRole('option')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()

    await user.type(box(), 's')
    await screen.findAllByRole('option')
    await user.tab()
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('shows no suggestions, and no error, when search by description is off', async () => {
    server.use(searchHandlers.unavailable)
    const { user } = setup()
    await screen.findByRole('heading', { level: 1, name: 'About' })

    await user.type(box(), 'desk')
    await vi.advanceTimersByTimeAsync(SUGGESTION_DELAY_MS * 2)

    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the searched words in the box on /search, and follows the URL', async () => {
    const { router } = setup('/search?q=reading+lamp')
    await screen.findByRole('heading', { level: 1, name: 'Results for “reading lamp”' })
    expect(box()).toHaveValue('reading lamp')

    await router.navigate('/search?q=desk')
    expect(await screen.findByRole('heading', { level: 1, name: 'Results for “desk”' })).toBeInTheDocument()
    expect(box()).toHaveValue('desk')
  })
})
