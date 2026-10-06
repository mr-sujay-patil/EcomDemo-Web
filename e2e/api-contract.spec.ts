import { expect, test } from './fixtures'

// The generated types (src/api/generated) say every response property is present, because the
// backend's documents mark none required but its JSON always includes them (web KI-016). This is
// the runtime check that keeps that assumption honest: if the backend ever omits one, it fails here.
const productKeys = ['category', 'description', 'id', 'imageUrl', 'name', 'price', 'stockQuantity']

test('every product the live backend returns has every property the generated type promises', async ({ request }) => {
  const response = await request.get('/api/products')

  expect(response.status()).toBe(200)
  const products = (await response.json()) as Record<string, unknown>[]
  expect(products.length).toBeGreaterThan(0)
  for (const product of products) {
    expect(Object.keys(product).sort()).toEqual(productKeys)
  }
})

test('an unknown product answers 404 with the backend’s { status, message } body and a correlation id', async ({
  request,
}) => {
  const response = await request.get('/api/products/999999999')

  expect(response.status()).toBe(404)
  const body = (await response.json()) as { status: number; message: string }
  expect(body.status).toBe(404)
  expect(body.message).toEqual(expect.any(String))
  expect(response.headers()['x-correlation-id']).toBeTruthy()
})
