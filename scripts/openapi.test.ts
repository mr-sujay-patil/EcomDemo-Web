import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  assumeResponsePropertiesPresent,
  describeDifference,
  findDrift,
  formatDocument,
  services,
  sortKeys,
} from './openapi.ts'

describe('formatDocument', () => {
  it('sorts keys at every depth, keeps array order, and ends with a newline', () => {
    const text = formatDocument({ b: 1, a: { d: [3, 1, 2], c: null } })

    expect(text).toBe(
      '{\n  "a": {\n    "c": null,\n    "d": [\n      3,\n      1,\n      2\n    ]\n  },\n  "b": 1\n}\n',
    )
  })

  it('gives the same text however the backend orders its keys', () => {
    expect(formatDocument({ x: 1, y: { p: 1, q: 2 } })).toBe(formatDocument({ y: { q: 2, p: 1 }, x: 1 }))
  })

  it('leaves values that are not objects alone', () => {
    expect(sortKeys('text')).toBe('text')
    expect(sortKeys(null)).toBeNull()
  })
})

describe('findDrift', () => {
  const document = { openapi: '3.1.0', components: { schemas: { Product: { properties: { stockQuantity: {} } } } } }

  it('finds nothing when the live document equals its snapshot', () => {
    expect(findDrift('catalog', formatDocument(document), document)).toBeNull()
  })

  it('fails on a changed snapshot and says where', () => {
    const renamed = { openapi: '3.1.0', components: { schemas: { Product: { properties: { stock: {} } } } } }

    const drift = findDrift('catalog', formatDocument(renamed), document)

    expect(drift?.service).toBe('catalog')
    expect(drift?.problem).toContain('first difference at line')
    expect(drift?.problem).toContain('"stock": {}')
    expect(drift?.problem).toContain('"stockQuantity": {}')
  })

  it('fails when a snapshot is missing', () => {
    expect(findDrift('app', null, document)?.problem).toContain('no snapshot is committed')
  })
})

describe('describeDifference', () => {
  it('reports a document that ends early', () => {
    expect(describeDifference('a', 'a\nb')).toContain('(end of file)')
  })
})

describe('the committed snapshots', () => {
  it.each(services)('%s.json is already in the canonical format', (service) => {
    const text = readFileSync(`api/openapi/${service}.json`, 'utf8')

    expect(formatDocument(JSON.parse(text))).toBe(text)
  })
})

describe('assumeResponsePropertiesPresent', () => {
  const document = {
    components: {
      schemas: {
        ProductResponse: { properties: { id: {}, category: { nullable: true } } },
        LoginRequest: { required: ['username'], properties: { username: {}, password: {} } },
        ProductUpsert: { properties: { name: {} } },
        Cart: { required: ['id'], properties: { id: {}, total: {} } },
        Empty: {},
      },
    },
  }

  const schemasOf = (input: object) =>
    (
      assumeResponsePropertiesPresent(input) as unknown as {
        components: { schemas: Record<string, { required?: string[] }> }
      }
    ).components.schemas

  it('lists every property of a response schema as required', () => {
    const schemas = schemasOf(document)

    expect(schemas.ProductResponse?.required).toEqual(['id', 'category'])
  })

  it('keeps the backend’s own required list, and leaves request schemas alone', () => {
    const schemas = schemasOf(document)

    expect(schemas.LoginRequest?.required).toEqual(['username'])
    expect(schemas.Cart?.required).toEqual(['id'])
    expect(schemas.ProductUpsert).not.toHaveProperty('required')
    expect(schemas.Empty).not.toHaveProperty('required')
  })

  it('does not change the document it was given', () => {
    const before = JSON.stringify(document)

    assumeResponsePropertiesPresent(document)

    expect(JSON.stringify(document)).toBe(before)
  })
})
