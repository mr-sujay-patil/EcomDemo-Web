import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './msw/server'

// A request with no handler fails the test instead of silently reaching (or missing) a real server.
// MSW 3 calls this onUnhandledFrame (MSW 2's onUnhandledRequest); a "frame" is an HTTP request or a WebSocket event.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))

afterEach(() => {
  cleanup() // unmount what the test rendered (automatic only with `globals: true`, which we don't use)
  server.resetHandlers() // drop the per-test overrides added with server.use()
})

afterAll(() => server.close())

// jsdom has no modal <dialog>: `showModal`, `close` and Escape are missing. This stand-in does what a test can see of them (`open`,
// the `close` event, focus going back to the opener, Escape firing `cancel` and then closing). It does NOT trap focus or make the
// page behind inert; those are the browser's, and the E2E suite (e2e/assistant.spec.ts) checks them in a real one.
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  const opener = new WeakMap<HTMLDialogElement, Element | null>()
  const openDialogs = new Set<HTMLDialogElement>()
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    opener.set(this, document.activeElement)
    this.setAttribute('open', '')
    openDialogs.add(this)
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    openDialogs.delete(this)
    const back = opener.get(this)
    if (back instanceof HTMLElement) back.focus()
    this.dispatchEvent(new Event('close'))
  }
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    const top = [...openDialogs].at(-1)
    if (!top) return
    const cancel = new Event('cancel', { cancelable: true })
    top.dispatchEvent(cancel)
    if (!cancel.defaultPrevented) top.close()
  })
  afterEach(() => openDialogs.clear())
}

// jsdom does not scroll: `Element.scrollTo` is missing (the assistant thread scrolls to its newest message).
if (typeof Element.prototype.scrollTo !== 'function') Element.prototype.scrollTo = () => undefined
