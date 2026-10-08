import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/msw/server'
import { confirmAction, sendChat } from './assistant'

describe('sendChat', () => {
  it('sends the conversation id only when there is one', async () => {
    const bodies: unknown[] = []
    server.use(
      http.post('/api/assistant/chat', async ({ request }) => {
        bodies.push(await request.json())
        return HttpResponse.json({
          conversationId: 'c1',
          answer: 'Hi',
          sources: [],
          toolsUsed: [],
          pendingAction: null,
        })
      }),
    )

    await sendChat('first', null)
    await sendChat('second', 'c1')

    expect(bodies).toEqual([{ message: 'first' }, { message: 'second', conversationId: 'c1' }])
  })

  it('refuses an answer without a body', async () => {
    server.use(http.post('/api/assistant/chat', () => new HttpResponse(null, { status: 200 })))

    await expect(sendChat('hi', null)).rejects.toThrow('The server answered without a reply.')
  })
})

describe('confirmAction', () => {
  it('refuses an answer without a body', async () => {
    server.use(http.post('/api/assistant/actions/:id/confirm', () => new HttpResponse(null, { status: 200 })))

    await expect(confirmAction('a1')).rejects.toThrow('The server answered without a confirmation.')
  })
})
