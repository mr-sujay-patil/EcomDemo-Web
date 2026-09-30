import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Intercepts fetch() inside the Node test process: the app code runs unchanged, only the network is fake.
export const server = setupServer(...handlers)
