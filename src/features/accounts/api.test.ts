import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/msw/server'
import { fetchMe, updateMe } from './api'

const empty = () => new HttpResponse(null, { status: 200 })

describe('the profile calls', () => {
  it('refuse an answer with no profile in it', async () => {
    server.use(http.get('/api/customers/me', empty), http.put('/api/customers/me', empty))

    await expect(fetchMe()).rejects.toThrow('The server answered without a profile.')
    await expect(updateMe({ fullName: 'Asha Rao' })).rejects.toThrow('The server answered without a profile.')
  })
})
