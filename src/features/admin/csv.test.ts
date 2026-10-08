import { describe, expect, it } from 'vitest'
import { IMPORT_HEADER, previewCsv, splitCsvLine } from './csv'

const header = IMPORT_HEADER.join(',')
const bom = String.fromCharCode(0xfeff)

describe('the CSV preview', () => {
  it('splits quoted commas and doubled quotes', () => {
    expect(splitCsvLine('Hub,"7-in-1, grey","a ""b""",2499.00,')).toEqual([
      'Hub',
      '7-in-1, grey',
      'a "b"',
      '2499.00',
      '',
    ])
  })

  it('accepts the required header and shows the first five rows of however many there are', () => {
    const rows = Array.from({ length: 8 }, (_, i) => `Item ${i},d,10.00,1,C`).join('\n')
    const preview = previewCsv(`${header}\n${rows}\n`)
    expect(preview).toMatchObject({ ok: true, rowCount: 8 })
    expect(preview.ok && preview.rows).toHaveLength(5)
  })

  it('accepts a byte-order mark, Windows line ends and blank lines', () => {
    expect(previewCsv(`${bom}${header}\r\n\r\nA,b,1.00,1,C\r\n`)).toMatchObject({ ok: true, rowCount: 1 })
  })

  it.each([
    ['', 'The file is empty.'],
    [`${header}\n`, 'The file has the header but no product rows.'],
    [
      'name,price\nA,1',
      'The first line must be exactly name,description,price,stock_quantity,category. This file starts with name,price.',
    ],
    ['price,name,description,stock_quantity,category\nA', 'The first line must be exactly'],
  ])('refuses %j', (text, reason) => {
    const preview = previewCsv(text)
    expect(preview.ok).toBe(false)
    expect(!preview.ok && preview.reason).toContain(reason)
  })
})
