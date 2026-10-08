import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'

const letter = (offset: number, replayed = false) => ({
  topic: 'order.events.DLT',
  partition: 0,
  offset,
  key: 'k',
  timestamp: '2026-10-08T10:00:00Z',
  originalTopic: 'order.events',
  exceptionClass: 'IllegalStateException',
  exceptionMessage: 'boom',
  payload: '{"orderId":7}',
  replayed,
})

describe('dead letters', () => {
  it('lists the records and the replay log; a replayed record has no button to press', async () => {
    server.use(
      http.get('/api/admin/dead-letters', () => HttpResponse.json([letter(1), letter(2, true)])),
      http.get('/api/admin/dead-letters/replays', () =>
        HttpResponse.json([
          {
            dltTopic: 'order.events.DLT',
            dltPartition: 0,
            dltOffset: 2,
            key: 'k',
            originalTopic: 'order.events',
            replayedAt: '2026-10-08T11:00:00Z',
            replayedBy: 'admin',
          },
        ]),
      ),
    )
    renderRoute('/admin/dead-letters', { signedInAs: 'ADMIN' })

    expect(await screen.findByRole('button', { name: 'Replay offset 1 from order.events' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Replay offset 2 from order.events' })).toBeDisabled()
    const log = await screen.findByRole('table', { name: 'Replay log' })
    expect(within(log).getByText('admin')).toBeInTheDocument()
  })

  it('replays only after the person agrees, then refreshes both lists', async () => {
    let replayedPath = ''
    let letters = [letter(1)]
    server.use(
      http.get('/api/admin/dead-letters', () => HttpResponse.json(letters)),
      http.get('/api/admin/dead-letters/replays', () => HttpResponse.json([])),
      http.post('/api/admin/dead-letters/:topic/:partition/:offset/replay', ({ request }) => {
        replayedPath = new URL(request.url).pathname
        letters = [letter(1, true)]
        return HttpResponse.json({
          dltTopic: 'order.events.DLT',
          dltPartition: 0,
          dltOffset: 1,
          key: 'k',
          originalTopic: 'order.events',
          replayedAt: '2026-10-08T11:00:00Z',
          replayedBy: 'admin',
        })
      }),
    )
    const user = userEvent.setup()
    renderRoute('/admin/dead-letters', { signedInAs: 'ADMIN' })

    await user.click(await screen.findByRole('button', { name: 'Replay offset 1 from order.events' }))
    expect(replayedPath).toBe('')
    await user.click(screen.getByRole('button', { name: 'Replay' }))
    expect(await screen.findByText('Sent the record at offset 1 back to order.events.')).toBeInTheDocument()
    expect(replayedPath).toBe('/api/admin/dead-letters/order.events.DLT/0/1/replay')
    expect(await screen.findByRole('button', { name: 'Replay offset 1 from order.events' })).toBeDisabled()
  })

  it("shows the server's reason for a 409", async () => {
    server.use(
      http.get('/api/admin/dead-letters', () => HttpResponse.json([letter(1)])),
      http.get('/api/admin/dead-letters/replays', () => HttpResponse.json([])),
      http.post('/api/admin/dead-letters/:topic/:partition/:offset/replay', () =>
        HttpResponse.json({ status: 409, message: 'That record was already replayed' }, { status: 409 }),
      ),
    )
    const user = userEvent.setup()
    renderRoute('/admin/dead-letters', { signedInAs: 'ADMIN' })

    await user.click(await screen.findByRole('button', { name: 'Replay offset 1 from order.events' }))
    await user.click(screen.getByRole('button', { name: 'Replay' }))
    expect(await screen.findByText('That record was already replayed')).toBeInTheDocument()
  })

  it('says so when there is nothing', async () => {
    server.use(
      http.get('/api/admin/dead-letters', () => HttpResponse.json([])),
      http.get('/api/admin/dead-letters/replays', () => HttpResponse.json([])),
    )
    renderRoute('/admin/dead-letters', { signedInAs: 'ADMIN' })
    expect(await screen.findByText('There are no dead letters.')).toBeInTheDocument()
    expect(await screen.findByText('Nothing has been replayed.')).toBeInTheDocument()
  })
})
