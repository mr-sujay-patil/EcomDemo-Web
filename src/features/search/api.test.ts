import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/errors'
import { server } from '@/test/msw/server'
import { isSearchUnavailable } from './api'
import { searchProducts } from './search'

const none = { q: 'lamp', category: null, minPrice: null, maxPrice: null }

describe('isSearchUnavailable', () => {
  const failure = (status: number) => new ApiError({ status, message: 'x', correlationId: null })

  it('is true only for the answer that means search by description is off', () => {
    expect(isSearchUnavailable(failure(503))).toBe(true)
    expect(isSearchUnavailable(failure(500))).toBe(false)
    expect(isSearchUnavailable(failure(400))).toBe(false)
    expect(isSearchUnavailable(new Error('boom'))).toBe(false)
    expect(isSearchUnavailable(null)).toBe(false)
  })
})

describe('searchProducts', () => {
  it('gives no products for an answer without a body', async () => {
    server.use(http.get('/api/products/search', () => new HttpResponse(null, { status: 200 })))

    await expect(searchProducts(none, 5)).resolves.toEqual([])
  })

  it('rejects with the ApiError when the search is refused', async () => {
    server.use(
      http.get('/api/products/search', () =>
        HttpResponse.json({ status: 400, message: 'q must not be blank' }, { status: 400 }),
      ),
    )

    await expect(searchProducts(none, 5)).rejects.toMatchObject({ status: 400, message: 'q must not be blank' })
  })
})
