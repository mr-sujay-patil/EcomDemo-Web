import { againstContainer } from './screens'
import { expect, test } from './fixtures'

// What nginx in the web container promises (nginx/default.conf.template). Against the dev preview server these headers are
// different, so the specs are registered only when the suite is pointed at a container (`npm run e2e:docker`, E2E_BASE_URL).
if (againstContainer) {
  test.describe('the web container', () => {
    test('/healthz answers 200 by itself', async ({ request }) => {
      const response = await request.get('/healthz')

      expect(response.status()).toBe(200)
      expect(await response.text()).toBe('ok\n')
    })

    test('a deep link returns index.html, so the app can route it', async ({ request }) => {
      for (const path of ['/products/1', '/admin/stock', '/orders/42']) {
        const response = await request.get(path)

        expect(response.status(), path).toBe(200)
        expect(response.headers()['content-type'], path).toContain('text/html')
        expect(await response.text(), path).toContain('<div id="root">')
      }
    })

    test('every response carries the security headers', async ({ request }) => {
      // The page, a built file, a missing file, the health check and a proxied API answer (whatever its status).
      const index = await request.get('/')
      const asset = (await index.text()).match(/(?:src|href)="(\/assets\/[^"]+)"/)?.[1] ?? '/assets/missing.js'
      for (const path of ['/', asset, '/assets/missing.js', '/healthz', '/api/products']) {
        const headers = (await request.get(path)).headers()

        expect(headers['x-content-type-options'], path).toBe('nosniff')
        expect(headers['referrer-policy'], path).toBe('strict-origin-when-cross-origin')
        expect(headers['cross-origin-opener-policy'], path).toBe('same-origin')
        expect(headers['permissions-policy'], path).toContain('camera=()')
        const policy = headers['content-security-policy'] ?? ''
        for (const directive of [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self'",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ]) {
          expect(policy, `${path}: ${directive}`).toContain(directive)
        }
        // The point of the policy: nothing inline and nothing evaluated.
        expect(policy, path).not.toMatch(/unsafe-inline|unsafe-eval/)
      }
    })

    test('a font file carries no security headers (they only cost bytes there); a script has them', async ({
      request,
    }) => {
      const page = await (await request.get('/')).text()
      const script = page.match(/src="(\/assets\/[^"]+\.js)"/)?.[1] ?? '/assets/missing.js'
      const stylesheet = page.match(/href="(\/assets\/[^"]+\.css)"/)?.[1] ?? '/assets/missing.css'
      const font = (await (await request.get(stylesheet)).text()).match(/url\(([^)]+\.woff2)\)/)?.[1]

      expect(font, 'the stylesheet names a font').toBeTruthy()
      const fontHeaders = (await request.get(font!.replace(/^["']|["']$/g, ''))).headers()
      expect(fontHeaders['content-security-policy']).toBeUndefined()
      expect(fontHeaders['cache-control']).toContain('immutable')
      expect((await request.get(script)).headers()['content-security-policy']).toContain("script-src 'self'")
    })

    test('index.html is always re-asked, and a hashed asset is kept for a year', async ({ request }) => {
      const index = await request.get('/')
      expect(index.headers()['cache-control']).toBe('no-cache')

      // The built file names come from index.html itself: they change with every build.
      const assets = [...(await index.text()).matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(
        (match) => match[1] ?? '',
      )
      expect(assets.length, 'index.html names built files').toBeGreaterThan(0)
      for (const asset of assets) {
        const response = await request.get(asset)
        expect(response.status(), asset).toBe(200)
        expect(response.headers()['cache-control'], asset).toBe('public, max-age=31536000, immutable')
      }
    })

    test('a built file that does not exist is a 404, not the app', async ({ request }) => {
      const response = await request.get('/assets/no-such-file-0000.js')

      expect(response.status()).toBe(404)
      expect(response.headers()['content-type']).not.toContain('javascript')
    })

    test('the server does not say which nginx version it is', async ({ request }) => {
      const response = await request.get('/')

      expect(response.headers()['server']).toBe('nginx')
    })

    test('the API is on the same origin, the gateway answers, and its headers come back', async ({ request }) => {
      const response = await request.get('/api/products', { headers: { 'X-Correlation-Id': 'e2e-container-check' } })

      expect(response.status()).toBe(200)
      expect(response.headers()['content-type']).toContain('application/json')
      // The gateway's own header, passed through (nginx adds none and caches nothing).
      expect(response.headers()['cache-control']).toContain('no-store')
      expect(response.headers()['x-correlation-id']).toBe('e2e-container-check')
    })

    test("an Authorization header reaches the gateway (a bad token is its 401, not nginx's)", async ({ request }) => {
      const response = await request.get('/api/cart', { headers: { Authorization: 'Bearer not-a-real-token' } })

      expect(response.status()).toBe(401)
    })

    test('a write through nginx is accepted by the gateway: Host matches Origin (web KI-017)', async ({
      request,
      baseURL,
    }) => {
      const response = await request.post('/api/auth/login', {
        headers: { Origin: baseURL ?? '' },
        data: { username: 'nobody.e2e', password: 'not a real password' },
      })

      // 401 is the gateway judging the login; a 403 would be its Host/Origin check refusing the request.
      expect(response.status()).toBe(401)
    })
  })
}
