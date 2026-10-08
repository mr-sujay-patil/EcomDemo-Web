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
