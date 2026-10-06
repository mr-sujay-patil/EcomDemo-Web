import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { AppProviders, createQueryClient } from '@/app/providers'
import { server } from '@/test/msw/server'
import { storeFor } from '@/test/render'
import { cartKeys, countItems, quantityInCart, useSetQuantity } from './api'

describe('cart helpers', () => {
  it('count and find nothing in a cart that is not loaded', () => {
    expect(countItems(undefined)).toBe(0)
    expect(quantityInCart(undefined, 1)).toBe(0)
  })
})

describe('changing a quantity before the cart has loaded', () => {
  it('leaves the cache empty on success of the call, and does not invent a cart when it is refused', async () => {
    server.use(
      http.put('/api/cart/items/:id', () => HttpResponse.json({ status: 400, message: 'No' }, { status: 400 })),
    )
    const client = createQueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AppProviders client={client} session={storeFor('CUSTOMER')}>
        {children}
      </AppProviders>
    )
    const { result } = renderHook(() => useSetQuantity(), { wrapper })

    result.current.mutate({ productId: 1, quantity: 2 })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(client.getQueryData(cartKeys.all)).toBeUndefined()
  })
})
