import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { assistantReply, CONVERSATION_ID, productFixtures } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'

const ACTION = {
  id: 'a1b2c3d4-0000-4000-8000-000000000001',
  productId: 1,
  productName: 'Test Kettle',
  quantity: 2,
  unitPrice: 1299,
}

/** A pretend server for one conversation: it records what arrives, and keeps the cart that a confirm fills. */
function fakeAssistant(reply = assistantReply()) {
  const chats: { message: string; conversationId?: string | null }[] = []
  const confirms: string[] = []
  const cartWrites: string[] = []
  let cartQuantity = 0
  server.use(
    http.post<never, { message: string; conversationId?: string | null }>(
      '/api/assistant/chat',
      async ({ request }) => {
        chats.push(await request.json())
        return HttpResponse.json(reply)
      },
    ),
    http.post<{ id: string }>('/api/assistant/actions/:id/confirm', ({ params }) => {
      confirms.push(String(params.id))
      cartQuantity += ACTION.quantity
      return HttpResponse.json({
        productId: ACTION.productId,
        productName: ACTION.productName,
        quantity: ACTION.quantity,
        cartTotal: 2598,
      })
    }),
    http.get('/api/cart', () =>
      HttpResponse.json({
        id: 1,
        items: cartQuantity
          ? [{ productId: 1, productName: 'Test Kettle', unitPrice: 1299, quantity: cartQuantity, lineTotal: 2598 }]
          : [],
        totalAmount: cartQuantity ? 2598 : 0,
      }),
    ),
    // The assistant must never write to the cart itself: any write here is a failure the tests look for.
    http.post('/api/cart/items', () => {
      cartWrites.push('POST /api/cart/items')
      return HttpResponse.json({}, { status: 500 })
    }),
  )
  return { chats, confirms, cartWrites }
}

async function openSheet(path = '/about', role: 'CUSTOMER' | 'ADMIN' | null = 'CUSTOMER') {
  const user = userEvent.setup()
  const view = renderRoute(path, { signedInAs: role ?? undefined })
  await screen.findByRole('heading', { level: 1 })
  const opener = screen.getByRole('button', { name: 'Ask the shop' })
  await user.click(opener)
  return { user, opener, ...view }
}

const sheet = () => screen.getByRole('dialog', { name: 'Ask the shop' })
const message = () => within(sheet()).getByRole('textbox', { name: 'Your message' })

async function ask(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(message(), text)
  await user.click(within(sheet()).getByRole('button', { name: 'Send' }))
}

describe('opening and closing the sheet', () => {
  it('opens from the header button, names itself, and puts the cursor in the message box', async () => {
    await openSheet()

    expect(sheet()).toHaveAttribute('open')
    expect(message()).toHaveFocus()
  })

  it('is closed until it is asked for', async () => {
    renderRoute('/about', { signedInAs: 'CUSTOMER' })
    await screen.findByRole('heading', { level: 1 })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes with Escape and gives focus back to the button', async () => {
    const { user, opener } = await openSheet()

    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(opener).toHaveFocus()
  })

  it('closes with its Close button, and opens again', async () => {
    const { user, opener } = await openSheet()

    await user.click(within(sheet()).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(opener).toHaveFocus()

    await user.click(opener)
    expect(sheet()).toBeVisible()
  })

  it('closes when the backdrop is clicked, but not when the sheet itself is', async () => {
    const { user } = await openSheet()

    await user.click(within(sheet()).getByRole('heading', { name: 'Ask the shop' }))
    expect(sheet()).toBeVisible()

    await user.click(sheet())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('keeps the conversation when it is closed and opened again', async () => {
    fakeAssistant()
    const { user, opener } = await openSheet()
    await ask(user, 'Tell me about the kettle')
    await screen.findByText('The Test Kettle boils fast.')

    await user.keyboard('{Escape}')
    await user.click(opener)

    expect(within(sheet()).getByText('The Test Kettle boils fast.')).toBeInTheDocument()
    expect(within(sheet()).getByText('Tell me about the kettle')).toBeInTheDocument()
  })
})

describe('who can ask', () => {
  it('asks a signed-out person to sign in, and brings them back to this page', async () => {
    await openSheet('/about', null)

    expect(within(sheet()).queryByRole('textbox')).not.toBeInTheDocument()
    expect(within(sheet()).getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in?next=%2Fabout')
  })

  it('tells an admin it is for customers, and sends nothing', async () => {
    await openSheet('/about', 'ADMIN')

    expect(within(sheet()).getByText('Ask the shop is for customer accounts.')).toBeInTheDocument()
    expect(within(sheet()).queryByRole('textbox')).not.toBeInTheDocument()
  })
})

describe('talking to the assistant', () => {
  it('shows the question, "Thinking…" while it waits, then the labelled answer with what it checked', async () => {
    server.use(
      http.post('/api/assistant/chat', async () => {
        await delay(100)
        return HttpResponse.json(
          assistantReply({
            answer: 'The Test Kettle is the one for you.',
            sources: [
              { type: 'PRODUCT', id: '1', title: 'Test Kettle' },
              { type: 'PRODUCT', id: '1', title: 'Test Kettle' },
              { type: 'PRODUCT', id: '3', title: 'Test Gift Card' },
            ],
          }),
        )
      }),
    )
    const { user } = await openSheet()

    await ask(user, 'Something for tea')

    expect(within(sheet()).getByText('Something for tea')).toBeInTheDocument()
    expect(await within(sheet()).findByText('Thinking…')).toBeInTheDocument()
    expect(await within(sheet()).findByText('The Test Kettle is the one for you.')).toBeInTheDocument()
    expect(within(sheet()).queryByText('Thinking…')).not.toBeInTheDocument()
    expect(within(sheet()).getByText('Shop assistant')).toBeInTheDocument()
    expect(within(sheet()).getByText('Checked: Test Kettle, Test Gift Card')).toBeInTheDocument()
    expect(message()).toHaveValue('')
  })

  it('sends the conversation id of the first answer with the second message', async () => {
    const server_ = fakeAssistant()
    const { user } = await openSheet()

    await ask(user, 'First')
    await screen.findByText('The Test Kettle boils fast.')
    await ask(user, 'Second')
    await waitFor(() => expect(server_.chats).toHaveLength(2))

    expect(server_.chats[0]).toEqual({ message: 'First' })
    expect(server_.chats[1]).toEqual({ message: 'Second', conversationId: CONVERSATION_ID })
  })

  it('sends on Enter, keeps a new line on Shift+Enter, and will not send nothing', async () => {
    const fake = fakeAssistant()
    const { user } = await openSheet()
    const send = within(sheet()).getByRole('button', { name: 'Send' })
    expect(send).toBeDisabled()

    await user.type(message(), '   ')
    expect(send).toBeDisabled()
    await user.type(message(), '{Shift>}{Enter}{/Shift}')
    expect(fake.chats).toHaveLength(0)

    await user.clear(message())
    await user.type(message(), 'Hello there{Enter}')

    await waitFor(() => expect(fake.chats).toEqual([{ message: 'Hello there' }]))
  })

  it('does not send a second message while the first is still being answered', async () => {
    const chats: string[] = []
    server.use(
      http.post<never, { message: string }>('/api/assistant/chat', async ({ request }) => {
        chats.push((await request.json()).message)
        await delay(150)
        return HttpResponse.json(assistantReply())
      }),
    )
    const { user } = await openSheet()

    await user.type(message(), 'First{Enter}')
    await user.type(message(), 'Second{Enter}')
    await screen.findByText('The Test Kettle boils fast.')

    expect(chats).toEqual(['First'])
  })

  it('does not send a message of only spaces on Enter', async () => {
    const fake = fakeAssistant()
    const { user } = await openSheet()

    await user.type(message(), '   {Enter}')
    await delay(50)

    expect(fake.chats).toEqual([])
  })

  it('limits a message to 1000 characters, as the backend does', async () => {
    await openSheet()

    expect(message()).toHaveAttribute('maxlength', '1000')
  })

  it('shows the server message when a question is refused or fails, and lets the person try again', async () => {
    server.use(
      http.post('/api/assistant/chat', () =>
        HttpResponse.json({ status: 400, message: 'message must not be blank' }, { status: 400 }),
      ),
    )
    const { user } = await openSheet()

    await ask(user, 'Hi')

    expect(await within(sheet()).findByText('message must not be blank')).toBeInTheDocument()
    expect(message()).toBeEnabled()
  })
})

describe('confirm before act', () => {
  const proposing = () => fakeAssistant(assistantReply({ answer: 'Two kettles would do it.', pendingAction: ACTION }))

  it('shows the proposal with the server price, and puts nothing in the cart until Add it is pressed', async () => {
    const fake = proposing()
    const { user } = await openSheet()

    await ask(user, 'Add two kettles')

    expect(await within(sheet()).findByText('Test Kettle')).toBeInTheDocument()
    expect(within(sheet()).getByText('₹1,299.00')).toBeInTheDocument()
    expect(within(sheet()).getByText(/add 2 to your cart\?/)).toBeInTheDocument()
    expect(within(sheet()).getByRole('button', { name: 'Add it' })).toBeInTheDocument()
    expect(within(sheet()).getByRole('button', { name: 'Not now' })).toBeInTheDocument()
    // Give anything that was going to happen on its own time to happen.
    await delay(100)
    expect(fake.confirms).toEqual([])
    expect(fake.cartWrites).toEqual([])
    expect(screen.queryByRole('link', { name: /^Cart, \d/ })).not.toBeInTheDocument()
  })

  it('confirms with the action id, says so, and refreshes the cart', async () => {
    const fake = proposing()
    const { user } = await openSheet()
    await ask(user, 'Add two kettles')

    await user.click(await within(sheet()).findByRole('button', { name: 'Add it' }))

    expect(await within(sheet()).findByText('Added 2 × Test Kettle to your cart.')).toBeInTheDocument()
    expect(fake.confirms).toEqual([ACTION.id])
    expect(fake.cartWrites).toEqual([])
    // The header's cart count comes from the cart query the confirm refreshed.
    expect(await screen.findByRole('link', { name: 'Cart, 2 items' })).toBeInTheDocument()
    // The offer is over: it cannot be pressed twice.
    expect(within(sheet()).queryByRole('button', { name: 'Add it' })).not.toBeInTheDocument()
  })

  it('"Not now" asks the server for nothing and takes the offer away', async () => {
    const fake = proposing()
    const { user } = await openSheet()
    await ask(user, 'Add two kettles')

    await user.click(await within(sheet()).findByRole('button', { name: 'Not now' }))

    expect(within(sheet()).queryByRole('button', { name: 'Add it' })).not.toBeInTheDocument()
    expect(within(sheet()).getByText('Two kettles would do it.')).toBeInTheDocument()
    await delay(50)
    expect(fake.confirms).toEqual([])
    expect(fake.cartWrites).toEqual([])
  })

  it('says plainly that a suggestion expired (404), and leaves the cart alone', async () => {
    const fake = proposing()
    server.use(
      http.post('/api/assistant/actions/:id/confirm', () =>
        HttpResponse.json({ status: 404, message: 'Unknown action' }, { status: 404 }),
      ),
    )
    const { user } = await openSheet()
    await ask(user, 'Add two kettles')

    await user.click(await within(sheet()).findByRole('button', { name: 'Add it' }))

    expect(
      await within(sheet()).findByText(
        'That suggestion has expired or was already added. Ask again and I will suggest it again.',
      ),
    ).toBeInTheDocument()
    expect(within(sheet()).queryByRole('button', { name: 'Add it' })).not.toBeInTheDocument()
    expect(fake.cartWrites).toEqual([])
    expect(screen.queryByRole('link', { name: /^Cart, \d/ })).not.toBeInTheDocument()
  })

  it('keeps the offer, and shows the message, when the confirm fails for another reason', async () => {
    proposing()
    server.use(
      http.post('/api/assistant/actions/:id/confirm', () =>
        HttpResponse.json({ status: 500, message: 'The cart is unavailable right now.' }, { status: 500 }),
      ),
    )
    const { user } = await openSheet()
    await ask(user, 'Add two kettles')

    await user.click(await within(sheet()).findByRole('button', { name: 'Add it' }))

    expect(await within(sheet()).findByText('The cart is unavailable right now.')).toBeInTheDocument()
    expect(within(sheet()).getByRole('button', { name: 'Add it' })).toBeEnabled()
  })

  it('gives the proposal the product photo and category from the catalogue', async () => {
    proposing()
    server.use(
      http.get('/api/products/1', () =>
        HttpResponse.json({ ...productFixtures[0]!, imageUrl: '/api/products/1/image' }),
      ),
    )
    const { user } = await openSheet()

    await ask(user, 'Add two kettles')

    // The tile shows the catalogue's photo for the product once the catalogue has answered.
    await waitFor(() => expect(sheet().querySelector('img')).toHaveAttribute('src', '/api/products/1/image'))
    expect(within(sheet()).getByRole('button', { name: 'Add it' })).toBeInTheDocument()
  })
})

describe('when there is no model (503)', () => {
  it('says the assistant is not available, offers a search of the same words, and stops sending', async () => {
    server.use(
      http.post('/api/assistant/chat', () =>
        HttpResponse.json({ status: 503, message: 'The assistant is not configured.' }, { status: 503 }),
      ),
    )
    const { user, router } = await openSheet()

    await ask(user, 'quiet keyboard')

    expect(await within(sheet()).findByText("The assistant isn't available right now.")).toBeInTheDocument()
    // Customer words, not system words.
    expect(within(sheet()).queryByText(/503|not configured/)).not.toBeInTheDocument()
    expect(message()).toBeDisabled()
    expect(within(sheet()).getByRole('button', { name: 'Send' })).toBeDisabled()

    await user.click(within(sheet()).getByRole('link', { name: 'Search the shop instead' }))

    expect(router.state.location.pathname).toBe('/search')
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('quiet keyboard')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
