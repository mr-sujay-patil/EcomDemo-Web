import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { budgets, checkBudgets, notOnShelf } from './check-budgets.mjs'

const page = (...preloads: string[]) =>
  [
    '<script type="module" crossorigin src="/assets/entry.js"></script>',
    ...preloads.map((path) => `<link rel="modulepreload" crossorigin href="/${path}">`),
  ].join('\n')

// Random bytes do not compress, so the gzipped size is about the size given.
const file = (kb: number) => new Uint8Array(randomBytes(kb * 1024))
const files = (entries: Record<string, number>) =>
  new Map(Object.entries(entries).map(([path, kb]) => [path, file(kb)]))

describe('check-budgets', () => {
  it('passes a build within both budgets, counting only what the shelf loads', () => {
    const { failures, shelf } = checkBudgets(
      files({ 'assets/entry.js': 20, 'assets/react.js': 60, 'assets/admin.js': 90 }),
      page('assets/react.js'),
    )

    expect(failures).toEqual([])
    expect(shelf).toEqual(['assets/entry.js', 'assets/react.js'])
  })

  it('does not count a chunk the shelf does not preload (a lazy page) towards the shelf', () => {
    const { shelfBytes } = checkBudgets(files({ 'assets/entry.js': 10, 'assets/lazy.js': 80 }), page())

    expect(shelfBytes).toBeLessThan(15 * 1024)
  })

  it('fails a chunk over the per-chunk limit, naming it', () => {
    const { failures } = checkBudgets(files({ 'assets/entry.js': 10, 'assets/big.js': budgets.chunkKB + 5 }), page())

    expect(failures).toHaveLength(1)
    expect(failures[0]).toContain('assets/big.js')
    expect(failures[0]).toContain(`${budgets.chunkKB} KB`)
  })

  it('fails when what the shelf loads adds up to more than the shelf limit, though no chunk is too big', () => {
    const { failures } = checkBudgets(files({ 'assets/entry.js': 90, 'assets/a.js': 90 }), page('assets/a.js'))

    expect(failures).toHaveLength(1)
    expect(failures[0]).toContain('the shelf loads')
  })

  it('refuses an index.html it cannot read an entry script from, rather than passing a build it did not check', () => {
    const { failures } = checkBudgets(files({ 'assets/entry.js': 10 }), '<html></html>')

    expect(failures.join(' ')).toContain('names no entry script')
  })

  it('ignores files that are not JavaScript', () => {
    const { chunks } = checkBudgets(
      files({ 'assets/entry.js': 10, 'assets/font.woff2': 200, 'assets/app.css': 200 }),
      page(),
    )

    expect(chunks.map((chunk) => chunk.path)).toEqual(['assets/entry.js'])
  })

  it(`fails when the shelf has to fetch more than ${budgets.shelfFiles} files before it can start (web KI-042)`, () => {
    const many = Array.from({ length: budgets.shelfFiles }, (_, i) => `assets/s${i}.js`)
    const { failures } = checkBudgets(files(Object.fromEntries(['assets/entry.js', ...many].map((p) => [p, 1]))), page(...many))

    expect(failures).toHaveLength(1)
    expect(failures[0]).toContain(`${budgets.shelfFiles + 1} files`)
    expect(checkBudgets(files({ 'assets/entry.js': 1, 'assets/a.js': 1 }), page('assets/a.js')).failures).toEqual([])
  })

  it('fails when a file the shelf loads first holds code that must wait for a later page or for after the first paint (web KI-042)', () => {
    const build = files({ 'assets/entry.js': 10, 'assets/shared.js': 5, 'assets/forms.js': 30 })
    const modules = {
      'assets/entry.js': ['/app/src/main.tsx', '/app/src/features/catalog/ProductListPage.tsx'],
      'assets/shared.js': ['/app/node_modules/zod/v4/core/core.js', '/app/node_modules/@opentelemetry/api/build/esm/index.js'],
      'assets/forms.js': ['/app/node_modules/react-hook-form/dist/index.esm.mjs', '/app/src/features/admin/AdminPage.tsx'],
    }
    const { failures } = checkBudgets(build, page('assets/shared.js'), modules)

    expect(failures).toHaveLength(2)
    expect(failures[0]).toContain('assets/shared.js')
    expect(failures[0]).toContain('zod')
    expect(failures[1]).toContain('@opentelemetry')
  })

  it('passes the same code in lazy chunks, and names every rule it checks', () => {
    const modules = {
      'assets/entry.js': ['/app/src/main.tsx', '/app/src/app/router.tsx'],
      'assets/forms.js': ['/app/node_modules/zod/v4/core/core.js', '/app/src/features/admin/AdminPage.tsx'],
      'assets/tracing.js': ['/app/node_modules/@opentelemetry/sdk-trace-web/build/esm/index.js'],
    }
    const build = files({ 'assets/entry.js': 10, 'assets/forms.js': 30, 'assets/tracing.js': 16 })

    expect(checkBudgets(build, page(), modules).failures).toEqual([])
    expect(notOnShelf.map((rule) => rule.what)).toEqual(
      expect.arrayContaining(['zod', 'react-hook-form', '@opentelemetry', 'the admin console']),
    )
  })

  it('refuses a chunk report that does not cover the files the shelf loads, rather than passing what it did not check', () => {
    const { failures } = checkBudgets(files({ 'assets/entry.js': 10 }), page(), { 'assets/other.js': [] })

    expect(failures.join(' ')).toContain('no module list for assets/entry.js')
  })
})
