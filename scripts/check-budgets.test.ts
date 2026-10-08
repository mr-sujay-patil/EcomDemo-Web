import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { budgets, checkBudgets } from './check-budgets.mjs'

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
})
