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
