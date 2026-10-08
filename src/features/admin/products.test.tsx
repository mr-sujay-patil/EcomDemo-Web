import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { productFixtures } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'

const kettle = productFixtures[0]!

describe('the admin product list', () => {
  it('lists every product with the server price and stock, and links to edit', async () => {
    renderRoute('/admin/products', { signedInAs: 'ADMIN' })

    const row = (await screen.findByRole('row', { name: /Test Kettle/ }))
    expect(within(row).getByText('₹1,299.00')).toBeInTheDocument()
    expect(within(row).getByText('Kitchen')).toBeInTheDocument()
    expect(within(row).getByRole('link', { name: 'Edit Test Kettle' })).toHaveAttribute('href', '/admin/products/1')
    expect(screen.getByRole('link', { name: 'New product' })).toHaveAttribute('href', '/admin/products/new')
  })

  it('opens at /admin on the products', async () => {
    renderRoute('/admin', { signedInAs: 'ADMIN' })
    expect(await screen.findByRole('heading', { name: 'Products' })).toBeInTheDocument()
  })

  it('keeps a customer out: Not permitted, and no product list is asked for', async () => {
    let asked = 0
    server.events.on('request:start', ({ request }) => {
      if (new URL(request.url).pathname === '/api/products') asked += 1
    })
    renderRoute('/admin/products', { signedInAs: 'CUSTOMER' })

    expect(await screen.findByRole('heading', { name: /not permitted/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Products' })).not.toBeInTheDocument()
    expect(asked).toBe(0)
    server.events.removeAllListeners()
  })

  it('deletes only after the product name is typed', async () => {
    let deleted: string | undefined
    server.use(
      http.delete('/api/products/:id', ({ params }) => {
        deleted = String(params.id)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderRoute('/admin/products', { signedInAs: 'ADMIN' })

    await user.click(await screen.findByRole('button', { name: 'Delete Test Kettle' }))
    const confirm = screen.getByRole('button', { name: 'Delete product' })
    expect(confirm).toBeDisabled()
    await user.type(screen.getByLabelText('Product name'), 'Test Kett')
    expect(confirm).toBeDisabled()
    await user.type(screen.getByLabelText('Product name'), 'le')
    expect(confirm).toBeEnabled()
    expect(deleted).toBeUndefined()

    await user.click(confirm)
    expect(await screen.findByText('Deleted “Test Kettle”.')).toBeInTheDocument()
    expect(deleted).toBe('1')
  })

  it('Cancel deletes nothing', async () => {
    let calls = 0
    server.use(
      http.delete('/api/products/:id', () => {
        calls += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderRoute('/admin/products', { signedInAs: 'ADMIN' })

    await user.click(await screen.findByRole('button', { name: 'Delete Test Kettle' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('button', { name: 'Delete product' })).not.toBeInTheDocument()
    expect(calls).toBe(0)
  })

  it('shows the server reason when a delete is refused', async () => {
    server.use(
      http.delete('/api/products/:id', () =>
        HttpResponse.json({ status: 404, message: 'Product 1 not found' }, { status: 404 }),
      ),
    )
    const user = userEvent.setup()
    renderRoute('/admin/products', { signedInAs: 'ADMIN' })

    await user.click(await screen.findByRole('button', { name: 'Delete Test Kettle' }))
    await user.type(screen.getByLabelText('Product name'), 'Test Kettle')
    await user.click(screen.getByRole('button', { name: 'Delete product' }))
    expect(await screen.findByText('Product 1 not found')).toBeInTheDocument()
  })
})

describe('the admin product form', () => {
  it('refuses a bad product before asking the server, with the store words', async () => {
    let posts = 0
    server.use(
      http.post('/api/products', () => {
        posts += 1
        return HttpResponse.json(kettle, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderRoute('/admin/products/new', { signedInAs: 'ADMIN' })

    await user.type(await screen.findByLabelText('Price'), '10.999')
    await user.click(screen.getByRole('button', { name: 'Create product' }))
    expect(await screen.findByText('Enter a name.')).toBeInTheDocument()
    expect(screen.getByText('Use rupees with at most two decimals, like 8999.50.')).toBeInTheDocument()
    expect(screen.getByText('Enter a stock level, 0 or more.')).toBeInTheDocument()
    expect(posts).toBe(0)
  })

  it('creates a product: the exact request, then back to the list with a notice', async () => {
    let sent: unknown
    server.use(
      http.post('/api/products', async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ ...kettle, id: 9, name: 'Mechanical Keyboard' }, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderRoute('/admin/products/new', { signedInAs: 'ADMIN' })

    await user.type(await screen.findByLabelText('Name'), '  Mechanical Keyboard ')
    await user.type(screen.getByLabelText('Price'), '8999.50')
    await user.type(screen.getByLabelText('Stock'), '25')
    await user.click(screen.getByRole('button', { name: 'Create product' }))

    expect(await screen.findByText('Created “Mechanical Keyboard”.')).toBeInTheDocument()
    expect(sent).toEqual({ name: 'Mechanical Keyboard', description: '', price: 8999.5, stockQuantity: 25 })
  })

  it('shows the server 400 on the fields it names', async () => {
    server.use(
      http.post('/api/products', () =>
        HttpResponse.json({ status: 400, message: 'name: must not be blank' }, { status: 400 }),
      ),
    )
    const user = userEvent.setup()
    renderRoute('/admin/products/new', { signedInAs: 'ADMIN' })

    await user.type(await screen.findByLabelText('Name'), 'A')
    await user.type(screen.getByLabelText('Price'), '5')
    await user.type(screen.getByLabelText('Stock'), '1')
    await user.click(screen.getByRole('button', { name: 'Create product' }))
    expect(await screen.findByText(/must not be blank/)).toBeInTheDocument()
  })

  it('edits from the server copy and sends a full replace', async () => {
    let sent: unknown
    server.use(
      http.put('/api/products/:id', async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ ...kettle, name: 'Test Kettle 2' })
      }),
    )
    const user = userEvent.setup()
    renderRoute('/admin/products/1', { signedInAs: 'ADMIN' })

    const name = await screen.findByLabelText('Name')
    expect(name).toHaveValue('Test Kettle')
    expect(screen.getByLabelText('Price')).toHaveValue('1299')
    await user.clear(name)
    await user.type(name, 'Test Kettle 2')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Saved “Test Kettle 2”.')).toBeInTheDocument()
    expect(sent).toEqual({
      name: 'Test Kettle 2',
      description: 'Fixture product',
      price: 1299,
      stockQuantity: 5,
      category: 'Kitchen',
    })
  })

  it('says so for a product that is gone, and for an id that is not a number', async () => {
    renderRoute('/admin/products/999', { signedInAs: 'ADMIN' })
    expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument()
  })

  it('treats a non-numeric id as not found without asking', async () => {
    renderRoute('/admin/products/abc', { signedInAs: 'ADMIN' })
    expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument()
  })
})

describe('writing a description', () => {
  const generated = {
    productId: 1,
    description: 'A fast, quiet kettle.',
    tags: ['kettle', 'kitchen'],
    seoTitle: 'Quiet kettle',
    model: 'test-model',
    generatedAt: '2026-10-08T10:00:00Z',
    promptTokens: null,
    completionTokens: null,
  }

  it('asks first and calls nothing until the person agrees', async () => {
    let calls = 0
    server.use(
      http.post('/api/products/:id/generate-description', () => {
        calls += 1
        return HttpResponse.json(generated)
      }),
    )
    const user = userEvent.setup()
    renderRoute('/admin/products/1', { signedInAs: 'ADMIN' })

    await user.click(await screen.findByRole('button', { name: 'Write a description' }))
    expect(screen.getByText(/there is no draft step/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(calls).toBe(0)
    expect(screen.getByLabelText('Description')).toHaveValue('Fixture product')
  })

  it('puts the text in the box, says it is saved, and Restore previous puts the old text back with a PUT', async () => {
    let restoredWith: unknown
    server.use(
      http.post('/api/products/:id/generate-description', () => HttpResponse.json(generated)),
      http.put('/api/products/:id', async ({ request }) => {
        restoredWith = await request.json()
        return HttpResponse.json(kettle)
      }),
    )
    const user = userEvent.setup()
    renderRoute('/admin/products/1', { signedInAs: 'ADMIN' })

    await user.click(await screen.findByRole('button', { name: 'Write a description' }))
    await user.click(screen.getByRole('button', { name: 'Write and replace' }))
    expect(await screen.findByText('The new description is saved')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toHaveValue('A fast, quiet kettle.')
    expect(screen.getByText(/kettle, kitchen/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Restore previous' }))
    expect(await screen.findByText('The previous description is back.')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toHaveValue('Fixture product')
    expect(restoredWith).toMatchObject({ name: 'Test Kettle', description: 'Fixture product', price: 1299 })
  })

  it('says plainly when no language model is configured', async () => {
    server.use(
      http.post('/api/products/:id/generate-description', () =>
        HttpResponse.json({ status: 503, message: 'No model' }, { status: 503 }),
      ),
    )
    const user = userEvent.setup()
    renderRoute('/admin/products/1', { signedInAs: 'ADMIN' })

    await user.click(await screen.findByRole('button', { name: 'Write a description' }))
    await user.click(screen.getByRole('button', { name: 'Write and replace' }))
    expect(await screen.findByText(/No language model is configured/)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByLabelText('Description')).toHaveValue('Fixture product')
    })
  })
})
