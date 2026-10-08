/** The header the import job requires, in this order (integration guide, "Admin console APIs"). */
export const IMPORT_HEADER = ['name', 'description', 'price', 'stock_quantity', 'category'] as const

/** How many data rows the preview shows. */
export const PREVIEW_ROWS = 5

/** One CSV line split into cells: commas separate, double quotes hold a comma, `""` is a quote. */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        cell += '"'
        i += 1
      } else if (char === '"') quoted = false
      else cell += char
    } else if (char === '"') quoted = true
    else if (char === ',') {
      cells.push(cell)
      cell = ''
    } else cell += char
  }
  cells.push(cell)
  return cells
}

export type CsvPreview = { ok: true; rows: string[][]; rowCount: number } | { ok: false; reason: string }

/**
 * What the admin sees before anything is sent: whether the first line is the required header and the first rows. It is a
 * look, not a validation of the rows: the server checks each row and skips the bad ones (`skipCount`).
 */
export function previewCsv(text: string): CsvPreview {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
  if (lines.length === 0) return { ok: false, reason: 'The file is empty.' }
  const header = splitCsvLine(lines[0]!).map((cell) => cell.trim())
  if (header.join(',') !== IMPORT_HEADER.join(',')) {
    return {
      ok: false,
      reason: `The first line must be exactly ${IMPORT_HEADER.join(',')}. This file starts with ${header.join(',')}.`,
    }
  }
  const rows = lines.slice(1)
  if (rows.length === 0) return { ok: false, reason: 'The file has the header but no product rows.' }
  return { ok: true, rows: rows.slice(0, PREVIEW_ROWS).map(splitCsvLine), rowCount: rows.length }
}
