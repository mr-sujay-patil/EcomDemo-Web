import { describe, expect, it, vi } from 'vitest'
import { createSessionStore, expiryOf, firstName, type Session } from './session'

const session = (token = 'tok-1'): Session => ({
  accessToken: token,
  expiresAt: 1_000_000,
  profile: { id: 1, username: 'asha.rao', fullName: 'Asha Rao', role: 'CUSTOMER', createdAt: '2026-10-06T10:00:00Z' },
})

describe('the session store', () => {
  it('starts signed out, with no token and no reason', () => {
    const store = createSessionStore()

    expect(store.getSnapshot()).toEqual({ session: null, endedBy: null })
    expect(store.token()).toBeNull()
  })

  it('holds the session and its token once started', () => {
    const store = createSessionStore()

    store.start(session())

    expect(store.getSnapshot().session?.profile.username).toBe('asha.rao')
    expect(store.token()).toBe('tok-1')
  })

  it('tells subscribers about every change, and stops when they unsubscribe', () => {
    const store = createSessionStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    store.start(session())
    store.end('signed-out')
    unsubscribe()
    store.start(session())

    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('hands React the same snapshot object until something changes', () => {
    const store = createSessionStore()
    const before = store.getSnapshot()

    expect(store.getSnapshot()).toBe(before)
    store.start(session())
    expect(store.getSnapshot()).not.toBe(before)
  })

  it.each(['signed-out', 'expired', 'rejected'] as const)('remembers why it ended: %s', (reason) => {
    const store = createSessionStore()
    store.start(session())

    expect(store.end(reason)).toBe(true)

    expect(store.getSnapshot()).toEqual({ session: null, endedBy: reason })
    expect(store.token()).toBeNull()
  })

  it('forgets the reason when someone signs in again', () => {
    const store = createSessionStore()
    store.start(session())
    store.end('expired')

    store.start(session('tok-2'))

    expect(store.getSnapshot().endedBy).toBeNull()
  })

  it('has nothing to end when nobody is signed in, and says so without telling subscribers', () => {
    const store = createSessionStore()
    const listener = vi.fn()
    store.subscribe(listener)

    expect(store.end('expired')).toBe(false)

    expect(listener).not.toHaveBeenCalled()
    expect(store.getSnapshot().endedBy).toBeNull()
  })

  describe('reject (the server said 401 to a token)', () => {
    it('ends the session when it was the token in use', () => {
      const store = createSessionStore()
      store.start(session('tok-1'))

      store.reject('tok-1')

      expect(store.getSnapshot()).toEqual({ session: null, endedBy: 'rejected' })
    })

    it('ignores a refusal of an older token: a late 401 must not end a newer session', () => {
      const store = createSessionStore()
      store.start(session('tok-new'))

      store.reject('tok-old')

      expect(store.token()).toBe('tok-new')
    })

    it('works when handed around as a bare callback (the API client calls it that way)', () => {
      const store = createSessionStore()
      store.start(session('tok-1'))
      const { reject } = store

      reject('tok-1')

      expect(store.getSnapshot().session).toBeNull()
    })
  })

  it('never touches localStorage, sessionStorage or cookies', () => {
    const store = createSessionStore()

    store.start(session())
    store.end('signed-out')

    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    expect(document.cookie).toBe('')
  })
})

describe('firstName', () => {
  it.each([
    ['Asha Rao', 'Asha'],
    ['  Asha   Rao  ', 'Asha'],
    ['Asha', 'Asha'],
  ])('takes the first word of %j: %s', (fullName, name) => {
    expect(firstName({ ...session().profile, fullName })).toBe(name)
  })

  it('falls back to the username, then to "Account"', () => {
    expect(firstName({ ...session().profile, fullName: '  ' })).toBe('asha.rao')
    expect(firstName({ ...session().profile, fullName: '  ', username: '' })).toBe('Account')
  })
})

describe('expiryOf', () => {
  it('prefers the moment the server gives', () => {
    expect(expiryOf({ expiresAt: '2026-09-22T09:30:00Z', expiresIn: 900 }, 0)).toBe(Date.parse('2026-09-22T09:30:00Z'))
  })

  it('works it out from the seconds when there is no moment, or an unreadable one', () => {
    expect(expiryOf({ expiresIn: 900 }, 1000)).toBe(901_000)
    expect(expiryOf({ expiresAt: 'soon', expiresIn: 900 }, 1000)).toBe(901_000)
  })

  it('is null when the server says neither', () => {
    expect(expiryOf({}, 1000)).toBeNull()
  })
})
