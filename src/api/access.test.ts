import { describe, expect, it } from 'vitest'
import { accessFor, notForTheFrontend } from './access'

type Snapshot = { paths: Record<string, Record<string, unknown>> }
// Vite reads the committed snapshots at build time (a test runs through the same pipeline).
const snapshots = import.meta.glob<Snapshot>('../../api/openapi/*.json', { eager: true, import: 'default' })
const methods = ['get', 'post', 'put', 'delete']

describe('accessFor', () => {
  it.each([
    ['GET', '/api/products', 'anyone'],
    ['POST', '/api/auth/login', 'anyone'],
    ['GET', '/api/customers/me', 'signed-in'],
    ['POST', '/api/orders', 'customer'],
    ['post', '/api/assistant/chat', 'customer'],
    ['DELETE', '/api/products/{id}', 'admin'],
    ['PUT', '/api/inventory/{productId}', 'admin'],
  ])('%s %s needs %s', (method, path, access) => {
    expect(accessFor(method, path)).toBe(access)
  })

  it('does not know a call the guide does not cover', () => {
    expect(accessFor('GET', '/api/nothing')).toBeUndefined()
    expect(accessFor('DELETE', '/api/inventory/{productId}')).toBeUndefined()
  })
})

describe('the rules against the committed snapshots', () => {
  // The guide's tables must cover every operation the backend documents, or say why one is left out.
  const operations = Object.values(snapshots).flatMap((document) =>
    Object.entries(document.paths).flatMap(([path, item]) =>
      Object.keys(item)
        .filter((method) => methods.includes(method))
        .map((method) => ({ method: method.toUpperCase(), path })),
    ),
  )

  it('reads all five documents', () => {
    expect(Object.keys(snapshots)).toHaveLength(5)
    expect(operations.length).toBeGreaterThan(30)
  })

  it.each(operations.map((operation) => [operation.method, operation.path] as const))(
    '%s %s has an access rule or is listed as not for the frontend',
    (method, path) => {
      const excluded = notForTheFrontend.some((entry) => entry.method === method && entry.path === path)

      expect(accessFor(method, path) !== undefined || excluded).toBe(true)
    },
  )
})
