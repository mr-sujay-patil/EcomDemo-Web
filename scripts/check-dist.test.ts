import { describe, expect, it } from 'vitest'
import { checkDist } from './check-dist.mjs'

const text = (content: string) => new TextEncoder().encode(content)
const check = (entries: Record<string, string>) =>
  checkDist(new Map(Object.entries(entries).map(([path, content]) => [path, text(content)]))).failures

describe('check-dist', () => {
  it('passes a build that only calls /api and carries library namespaces', () => {
    expect(
      check({
        'assets/app.js':
          'fetch("/api/products");const ns="http://www.w3.org/2000/svg",base=new URL(`http://localhost`);' +
          'const help="https://react.dev/errors/31";const label={password:"Password",username:"Username"}',
        'index.html': '<script type="module" src="/assets/app.js"></script>',
      }),
    ).toEqual([])
  })

  it.each([
    ['a backend address with a port', 'fetch("http://localhost:8080/api/products")'],
    ['a loopback address', 'const base="http://127.0.0.1/api"'],
    ['the gateway service name', 'const upstream="gateway-service"'],
    ['an absolute URL of another site', 'fetch("https://api.example.com/v1/orders")'],
  ])('fails on %s', (_name, code) => {
    expect(check({ 'assets/app.js': code }).length).toBeGreaterThan(0)
  })

  it.each([
    ['a private key', '-----BEGIN RSA PRIVATE KEY-----'],
    ['an AWS access key id', 'const k="AKIAABCDEFGHIJKLMNOP"'],
    ['a GitHub token', `const t="ghp_${'a1'.repeat(20)}"`],
    ['a JSON Web Token', 'const t="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sig"'],
    ['a password given a literal value', 'const c={password:"hunter2hunter2"}'],
  ])('fails on %s', (_name, code) => {
    expect(check({ 'assets/app.js': code })).toEqual([expect.stringContaining('looks like')])
  })

  it('fails on a source map and on an environment file', () => {
    expect(check({ 'assets/app.js.map': '{}', '.env.production': 'A=1' })).toHaveLength(2)
  })

  it('does not read binary files', () => {
    expect(check({ 'assets/font.woff2': 'http://localhost:8080 AKIAABCDEFGHIJKLMNOP' })).toEqual([])
  })
})
