import { describe, expect, it } from 'vitest'
import { checkProject, checkSource } from './check-tokens.mjs'

const css = (body: string) => checkSource('src/components/Thing/Thing.css', body)
const ts = (body: string) => checkSource('src/components/Thing/Thing.tsx', body)

describe('check-tokens: what it refuses', () => {
  it.each([
    ['a hex colour', '.a { color: #1d5c4f; }'],
    ['a short hex colour', '.a { background: #fff; }'],
    ['rgb()', '.a { border-color: rgb(0 0 0); }'],
    ['rgba()', '.a { box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1); }'],
    ['hsl()', '.a { color: hsl(10 20% 30%); }'],
    ['a named colour', '.a { background: white; }'],
    ['a named colour in a shorthand', '.a { border: 1px solid red; }'],
    ['a px font size', '.a { font-size: 14px; }'],
    ['a px font size in the font shorthand', '.a { font: 600 14px/20px sans-serif; }'],
    ['a gradient', '.a { background: linear-gradient(red, blue); }'],
    ['a gradient without a colour in it', '.a { background-image: radial-gradient(var(--brand), var(--surface)); }'],
    ['a Tailwind directive', '@tailwind base;'],
  ])('CSS: %s', (_name, body) => {
    expect(css(body).length).toBeGreaterThan(0)
  })

  it.each([
    ['a hex string', "const style = { color: '#1d5c4f' }"],
    ['an rgb string', "const shadow = '0 0 0 1px rgba(0,0,0,.1)'"],
    ['a named colour', "const style = { backgroundColor: 'tomato' }"],
    ['a gradient', "const x = 'linear-gradient(red, blue)'"],
    ['an inline font size', 'const style = { fontSize: 14 }'],
    ['a Tailwind import', "import 'tailwindcss'"],
    ['a Radix import', "import * as Dialog from '@radix-ui/react-dialog'"],
    ['a shadcn import', "import { Button } from 'shadcn/ui/button'"],
    ['a Lucide import', "import { Cart } from 'lucide-react'"],
    ['a Heroicons import', "import { XIcon } from '@heroicons/react/24/outline'"],
  ])('TypeScript: %s', (_name, body) => {
    expect(ts(body).length).toBeGreaterThan(0)
  })

  it.each([
    ['a party popper', 'const label = "Order placed 🎉"'],
    ['a check mark emoji', 'const ok = "✅"'],
    ['a sparkle', 'const ai = "✨"'],
  ])('emoji: %s', (_name, body) => {
    const [first, ...rest] = ts(body)

    expect(rest).toEqual([])
    expect(first?.message).toContain('emoji')
  })

  it('says where: file, line and why', () => {
    const [first, ...rest] = css('.a {\n  margin: 0;\n  color: #fff;\n}')

    expect(rest).toEqual([])
    expect(first?.file).toBe('src/components/Thing/Thing.css')
    expect(first?.line).toBe(3)
    expect(first?.message).toContain('hex colour')
  })
})

describe('check-tokens: what it lets through', () => {
  it.each([
    ['tokens', '.a { color: var(--ink); background: var(--surface-card); border: 1px solid var(--border); }'],
    ['transparent and currentColor', '.a { background: transparent; fill: none; stroke: currentColor; }'],
    ['type tokens', '.a { font: 600 var(--fs-label)/var(--lh-label) var(--font-sans); font-size: var(--fs-body); }'],
    ['px that is not a font size', '.a { min-height: 40px; padding: 1px 6px; width: 32px; }'],
    [
      'a colour word that is not a colour',
      '.a { font-family: Newsreader, serif; outline: none; border-style: solid; }',
    ],
    ['a hex colour in a comment', '/* was #1d5c4f */ .a { color: var(--brand); }'],
    ['an anchor that looks like hex', "const href = '#main'"],
    ['the rupee sign, arrows and dashes', "const text = '₹1,299 → next – done…'"],
  ])('%s', (_name, body) => {
    expect(css(body)).toEqual([])
    expect(ts(body)).toEqual([])
  })

  it('does not look inside tokens.css or the generated API types', () => {
    expect(checkSource('src/styles/tokens.css', ':root { --brand: #1d5c4f; font-size: 14px; }')).toEqual([])
    expect(checkSource('src/api/generated/catalog.ts', "const x = '#fff'")).toEqual([])
  })
})

describe('the app itself', () => {
  it('has no stray colours, px font sizes, gradients, banned imports or emoji in src/', () => {
    expect(checkProject(process.cwd())).toEqual([])
  })
})
