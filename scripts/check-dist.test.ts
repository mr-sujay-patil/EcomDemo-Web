import { describe, expect, it } from 'vitest'
import { checkDist, checkFirstViewFontFaces, checkFontPreloads, checkInlineScripts } from './check-dist.mjs'

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

describe('check-dist: font preloads (web KI-043)', () => {
  const policy = (fontSrc: string) =>
    `add_header Content-Security-Policy "default-src 'self'; script-src 'self'; font-src ${fontSrc}; style-src 'self'" always;`
  const link = (href: string, extra = 'as="font" type="font/woff2" crossorigin') =>
    `<link rel="preload" href="${href}" ${extra} />`
  const built = [
    'assets/IBMPlexSans-Regular-AAAA1111.woff2',
    'assets/Newsreader-SemiBold-BBBB2222.woff2',
    'assets/app.js',
  ]
  const page = (...links: string[]) => `<head>${links.join('')}</head>`
  const both = page(
    link('/assets/Newsreader-SemiBold-BBBB2222.woff2'),
    link('/assets/IBMPlexSans-Regular-AAAA1111.woff2'),
  )

  it('passes when every required face is preloaded from a file in the build, allowed by font-src', () => {
    expect(checkFontPreloads(both, built, policy("'self'"), ['Newsreader-SemiBold', 'IBMPlexSans-Regular'])).toEqual([])
  })

  it('fails when a required face is not preloaded (the shelf before the fix)', () => {
    expect(
      checkFontPreloads(page(link('/assets/Newsreader-SemiBold-BBBB2222.woff2')), built, policy("'self'"), [
        'Newsreader-SemiBold',
        'IBMPlexSans-Regular',
      ]),
    ).toEqual([
      'index.html: IBMPlexSans-Regular is not preloaded; the largest paint on the shelf uses it, and a font found only after React has rendered lands on the LCP (web KI-043)',
    ])
  })

  it('fails a preload of a file the build does not have (a stale hash, or a source path Vite did not rewrite)', () => {
    expect(
      checkFontPreloads(page(link('/src/styles/fonts/IBMPlexSans-Regular.woff2')), built, policy("'self'"), []),
    ).toEqual([
      'index.html: the font preload /src/styles/fonts/IBMPlexSans-Regular.woff2 is not a file in the build (dist/assets); the browser would fetch a 404 and the face again',
    ])
  })

  it('fails a preload without crossorigin or the font type (the browser would not reuse it, and fetch the face twice)', () => {
    const failures = checkFontPreloads(
      page(
        link('/assets/IBMPlexSans-Regular-AAAA1111.woff2', 'as="font" type="font/woff2"'),
        link('/assets/Newsreader-SemiBold-BBBB2222.woff2', 'as="font" crossorigin'),
      ),
      built,
      policy("'self'"),
      [],
    )
    expect(failures).toEqual([
      'index.html: the font preload /assets/IBMPlexSans-Regular-AAAA1111.woff2 needs crossorigin (fonts are fetched in CORS mode; without it the preload is not reused)',
      'index.html: the font preload /assets/Newsreader-SemiBold-BBBB2222.woff2 needs type="font/woff2"',
    ])
  })

  it("fails when the policy's font-src does not allow this origin, and a face preloaded twice", () => {
    expect(checkFontPreloads(both, built, policy("'none'"), [])).toEqual([
      "nginx/security-headers.conf: font-src must allow 'self', or every preloaded and @font-face font is blocked",
    ])
    expect(
      checkFontPreloads(
        page(link('/assets/IBMPlexSans-Regular-AAAA1111.woff2'), link('/assets/IBMPlexSans-Regular-AAAA1111.woff2')),
        built,
        policy("'self'"),
        [],
      ),
    ).toEqual(['index.html: /assets/IBMPlexSans-Regular-AAAA1111.woff2 is preloaded more than once'])
  })
})

// Lighthouse's simulated LCP replays every request that ended before the observed LCP (web KI-042, KI-043). A face declared in the
// first stylesheet is requested as soon as React draws text in it, so on a fast load (CI) all of them end before the products'
// paint and are counted on the slow link. Only the preloaded faces belong there; the rest load after the first paint.
describe('check-dist: the faces the first stylesheet declares', () => {
  const face = (file: string) => `@font-face{font-family:X;src:url(/assets/${file}) format("woff2")}`
  const stylesheet = (href: string) => `<link rel="stylesheet" crossorigin href="${href}">`
  const indexHtml = `<head>${stylesheet('/assets/index-CCCC3333.css')}</head>`
  const allowed = ['Newsreader-SemiBold', 'IBMPlexSans-Regular']

  it('passes when the first stylesheet declares only the preloaded faces', () => {
    const files = new Map([
      ['assets/index-CCCC3333.css', `${face('Newsreader-SemiBold-BBBB2222.woff2')}${face('IBMPlexSans-Regular-AAAA1111.woff2')}body{}`],
    ])
    expect(checkFirstViewFontFaces(indexHtml, files, allowed)).toEqual([])
  })

  it('fails each other face it declares (the shelf before the fix: seven faces in index.css)', () => {
    const files = new Map([
      [
        'assets/index-CCCC3333.css',
        `${face('IBMPlexSans-Regular-AAAA1111.woff2')}${face('IBMPlexMono-Regular-DDDD4444.woff2')}${face('Newsreader-Medium-EEEE5555.woff2')}`,
      ],
    ])
    expect(checkFirstViewFontFaces(indexHtml, files, allowed)).toEqual([
      'assets/index-CCCC3333.css: declares IBMPlexMono-Regular, which is not preloaded; a face in the first stylesheet ends before the LCP on a fast load and is counted in the simulated LCP (web KI-042). Declare it in src/styles/fonts-deferred.css, loaded after the first paint',
      'assets/index-CCCC3333.css: declares Newsreader-Medium, which is not preloaded; a face in the first stylesheet ends before the LCP on a fast load and is counted in the simulated LCP (web KI-042). Declare it in src/styles/fonts-deferred.css, loaded after the first paint',
    ])
  })

  it('ignores stylesheets the page loads later (a lazy route, the deferred faces)', () => {
    const files = new Map([
      ['assets/index-CCCC3333.css', 'body{}'],
      ['assets/fonts-deferred-FFFF6666.css', face('IBMPlexMono-Regular-DDDD4444.woff2')],
    ])
    expect(checkFirstViewFontFaces(indexHtml, files, allowed)).toEqual([])
  })

  it('fails when index.html links no stylesheet from the build, so the check cannot see the first view', () => {
    expect(checkFirstViewFontFaces('<head></head>', new Map(), allowed)).toEqual([
      'index.html: links no stylesheet from dist/assets; the first view\'s font faces cannot be checked',
    ])
  })
})
