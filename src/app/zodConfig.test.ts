import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import './zodConfig'

describe('zodConfig', () => {
  it('turns off zod’s compiled schemas, so it never probes for eval (a Content-Security-Policy violation)', () => {
    expect(z.config().jitless).toBe(true)
  })

  it('still validates', () => {
    const schema = z.object({ name: z.string().min(2) })

    expect(schema.safeParse({ name: 'ok' }).success).toBe(true)
    expect(schema.safeParse({ name: 'x' }).success).toBe(false)
  })
})

// The setting must be applied before a schema is used, and main.tsx no longer imports it (web KI-042: it put zod in the shelf's
// entry). So every module that imports zod imports this file first.
const sources = import.meta.glob<string>(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}', '!/src/app/zodConfig.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

describe('every module that uses zod', () => {
  it('imports zodConfig before zod', () => {
    const users = Object.entries(sources).filter(([, text]) => /from 'zod'/.test(text))

    expect(users.map(([path]) => path).sort()).toEqual([
      '/src/features/accounts/schemas.ts',
      '/src/features/admin/schemas.ts',
    ])
    for (const [path, text] of users) {
      expect(text.indexOf("import '@/app/zodConfig'"), path).toBeGreaterThanOrEqual(0)
      expect(text.indexOf("import '@/app/zodConfig'"), path).toBeLessThan(text.indexOf("from 'zod'"))
    }
  })

  it('is not imported by main.tsx, which would put zod back in the shelf’s first files', () => {
    expect(Object.keys(sources)).toContain('/src/main.tsx')
    expect(sources['/src/main.tsx']).not.toContain('zodConfig')
  })
})
