import { describe, expect, it } from 'vitest'
import { safeNext, signInPath } from './nextPath'

describe('safeNext', () => {
  it.each(['/', '/orders', '/orders/42', '/orders?page=2', '/checkout#pay', '/products/1?x=1&y=2'])(
    'keeps the page of this site %s',
    (path) => {
      expect(safeNext(path)).toBe(path)
    },
  )

  it.each([
    [null, 'nothing'],
    ['', 'empty'],
    ['orders', 'no leading slash'],
    ['//evil.example', 'protocol-relative'],
    ['//evil.example/orders', 'protocol-relative with a path'],
    ['/\\evil.example', 'backslash trick'],
    ['https://evil.example', 'absolute'],
    ['javascript:alert(1)', 'a script'],
    ['/sign-in', 'the sign-in page (a loop)'],
    ['/sign-in?next=%2Forders', 'the sign-in page with a query (a loop)'],
    ['/register', 'the registration page'],
    ['/register#top', 'the registration page with a fragment'],
  ])('sends %j (%s) to the home page', (...row) => {
    expect(safeNext(row[0])).toBe('/')
  })
})

describe('signInPath', () => {
  it('keeps the whole address, encoded, in ?next=', () => {
    expect(signInPath({ pathname: '/orders/42', search: '?tab=items&x=a b', hash: '#top' })).toBe(
      '/sign-in?next=%2Forders%2F42%3Ftab%3Ditems%26x%3Da%20b%23top',
    )
  })

  it('round-trips through safeNext', () => {
    const here = { pathname: '/orders', search: '?page=2', hash: '' }
    const raw = new URLSearchParams(signInPath(here).split('?')[1]).get('next')

    expect(safeNext(raw)).toBe('/orders?page=2')
  })
})
