import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { RouteObject } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/errors'
import { renderRoute, renderWithProviders } from '@/test/render'
import { RootErrorBoundary } from './RootErrorBoundary'
import { RootRouteError } from './ErrorPages'
import { routes } from './router'
import { UnhandledRejectionNotice } from './UnhandledRejectionNotice'

function Boom({ error }: { error: unknown }): never {
  throw error
}

/** The app's route table with one more route, inside the layout and its route boundary, that throws when rendered. */
function tableWith(error: unknown): RouteObject[] {
  const [layout] = routes
  const boundary = layout?.children?.[0]
  if (!layout || !boundary) throw new Error('the route table changed shape')
  const withBoom: RouteObject = {
    ...boundary,
    index: undefined,
    children: [{ path: 'boom', element: <Boom error={error} /> }, ...(boundary.children ?? [])],
  }
  return [{ ...layout, children: [withBoom] } as RouteObject]
}

beforeEach(() => {
  // React and the app both write a caught render error to the console; the tests read it from there.
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('a route that breaks', () => {
  it('shows the reference page in place of the route, with the header and footer still there', async () => {
    renderRoute('/boom', {}, tableWith(new Error('render failed')))

    expect(await screen.findByRole('heading', { level: 1, name: 'This page did not load' })).toBeInTheDocument()
    expect(screen.getByText(/^Reference:/)).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the products' })).toHaveAttribute('href', '/')
  })

  it('quotes the correlation id of a failed call as the reference', async () => {
    const failure = new ApiError({ status: 503, message: 'Down.', correlationId: 'abc12345-trace' })
    renderRoute('/boom', {}, tableWith(failure))

    expect(await screen.findByText('abc12345-trace')).toBeInTheDocument()
    expect(console.error).toHaveBeenCalledWith('[reference abc12345-trace]', failure)
  })

  it('gives an error that was not a call a fresh reference, and writes it to the console with the error', async () => {
    const failure = new Error('render failed')
    renderRoute('/boom', {}, tableWith(failure))

    await screen.findByRole('heading', { name: 'This page did not load' })
    const call: unknown[] =
      vi.mocked(console.error).mock.calls.find(([first]) => String(first).startsWith('[reference')) ?? []
    expect(call[1]).toBe(failure)
    const reference = String(call[0]).slice('[reference '.length, -1)
    expect(reference).toMatch(/^[0-9a-f-]{36}$/)
    expect(screen.getByText(reference)).toBeInTheDocument()
  })
})

describe('the layout that breaks', () => {
  it('shows a page of its own: no header, no footer', async () => {
    const table: RouteObject[] = [
      {
        element: <Boom error={new Error('layout failed')} />,
        errorElement: <RootRouteError />,
        children: [{ index: true, element: <p>never shown</p> }],
      },
    ]
    renderRoute('/', {}, table)

    expect(await screen.findByRole('heading', { level: 1, name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })
})

describe('the root boundary', () => {
  it('catches a render error outside every route', () => {
    render(
      <RootErrorBoundary>
        <Boom error={new Error('providers failed')} />
      </RootErrorBoundary>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByText(/^Reference:/)).toBeInTheDocument()
  })

  it('renders its children when nothing is wrong', () => {
    render(
      <RootErrorBoundary>
        <p>fine</p>
      </RootErrorBoundary>,
    )

    expect(screen.getByText('fine')).toBeInTheDocument()
  })
})

describe('the reference', () => {
  it('is copied by the button, which says so', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    const failure = new ApiError({ status: 503, message: 'Down.', correlationId: 'copy-me-12345' })
    renderRoute('/boom', {}, tableWith(failure))

    await user.click(await screen.findByRole('button', { name: 'Copy reference' }))

    expect(writeText).toHaveBeenCalledWith('copy-me-12345')
    expect(await screen.findByText('Copied.')).toBeInTheDocument()
  })

  it('says so when the browser will not copy, and keeps the text', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))
    const failure = new ApiError({ status: 0, message: 'Offline.', correlationId: 'keep-me-12345' })
    renderRoute('/boom', {}, tableWith(failure))

    await user.click(await screen.findByRole('button', { name: 'Copy reference' }))

    expect(await screen.findByText(/Could not copy/)).toBeInTheDocument()
    expect(screen.getByText('keep-me-12345')).toBeInTheDocument()
  })
})

describe('a promise nobody caught', () => {
  function reject(reason: unknown) {
    // The event is built by hand: jsdom does not raise `unhandledrejection` for a real rejection.
    const event = new Event('unhandledrejection') as PromiseRejectionEvent
    Object.defineProperty(event, 'reason', { value: reason })
    act(() => {
      window.dispatchEvent(event)
    })
  }

  it('shows the reference once, not once per rejection', async () => {
    renderWithProviders(<UnhandledRejectionNotice />)

    reject(new ApiError({ status: 500, message: 'Broke.', correlationId: 'first-12345' }))
    reject(new ApiError({ status: 500, message: 'Broke again.', correlationId: 'second-12345' }))

    expect(await screen.findAllByRole('alert')).toHaveLength(1)
    expect(screen.getByText('first-12345')).toBeInTheDocument()
    expect(screen.queryByText('second-12345')).not.toBeInTheDocument()
  })

  it('can be dismissed, and then shows the next one', async () => {
    const user = userEvent.setup()
    renderWithProviders(<UnhandledRejectionNotice />)
    reject(new ApiError({ status: 500, message: 'Broke.', correlationId: 'first-12345' }))

    await user.click(await screen.findByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    reject(new ApiError({ status: 500, message: 'Broke again.', correlationId: 'second-12345' }))

    expect(await screen.findByText('second-12345')).toBeInTheDocument()
  })

  it('ignores a cancelled request, which is the caller’s own doing', () => {
    renderWithProviders(<UnhandledRejectionNotice />)

    reject(new DOMException('aborted', 'AbortError'))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('stops listening when it goes away', () => {
    const { unmount } = renderWithProviders(<UnhandledRejectionNotice />)
    unmount()

    reject(new Error('late'))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
