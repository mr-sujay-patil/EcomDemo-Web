import { describe, expect, it } from 'vitest'
import { checkDist, checkInlineScripts } from './check-dist.mjs'

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

describe('check-dist: inline scripts and the Content-Security-Policy (web KI-027)', () => {
  // sha256 of "a()", base64: what a browser compares against `script-src` before it runs an inline script.
  const hashOfA = "'sha256-qVpDBgj7bpq5hMAcGp3AOc79J3Y1Z4HvySTwKrWDoy4='"
  const policy = (scriptSrc: string) =>
    `add_header Content-Security-Policy "default-src 'self'; script-src ${scriptSrc}; style-src 'self'" always;`
  const page = '<head><script src="/theme-init.js"></script><script>a()</script></head>'

  it('passes when every inline script is allowed by its exact hash', () => {
    expect(checkInlineScripts(page, policy(`'self' ${hashOfA}`))).toEqual([])
  })

  it('fails an inline script the policy does not allow, naming the hash to add', () => {
    expect(checkInlineScripts(page, policy("'self'"))).toEqual([
      `index.html: an inline script is not allowed by the Content-Security-Policy's script-src (the browser will block it); add ${hashOfA} to nginx/security-headers.conf`,
    ])
  })

  it('fails a changed inline script (a hash of other text allows nothing)', () => {
    expect(checkInlineScripts(page.replace('a()', 'a( )'), policy(`'self' ${hashOfA}`))).toHaveLength(2)
  })

  it("fails a hash left for a script that is gone, and 'unsafe-inline' whatever else", () => {
    expect(checkInlineScripts('<script src="/x.js"></script>', policy(`'self' ${hashOfA}`))).toEqual([
      `nginx/security-headers.conf: script-src allows ${hashOfA}, which matches no inline script in index.html; remove it`,
    ])
    expect(checkInlineScripts(page, policy(`'self' 'unsafe-inline' ${hashOfA}`))).toEqual([
      "nginx/security-headers.conf: script-src must not allow 'unsafe-inline' or 'unsafe-eval'",
    ])
  })

  it('fails when it cannot find the policy at all', () => {
    expect(checkInlineScripts(page, '# nothing here')).toEqual([
      'nginx/security-headers.conf: no Content-Security-Policy with a script-src was found',
    ])
  })
})
