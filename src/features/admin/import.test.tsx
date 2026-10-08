import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderRoute } from '@/test/render'
import { ApiError } from '@/api/errors'
import { importForm, importProducts, restartImport } from './batch'
import { preloadAdminConsole } from '@/test/preloadAdminConsole'

// jsdom's FormData cannot travel through Node's Request, so the page is tested with the upload call replaced, and the
// body it builds is tested on its own below. The real multipart upload is covered by e2e/admin.spec.ts.
vi.mock('./batch', async (original) => ({
  ...(await original<typeof import('./batch')>()),
  importProducts: vi.fn(),
  restartImport: vi.fn(),
}))

const HEADER = 'name,description,price,stock_quantity,category'
const csv = (text: string, name = 'products.csv') => new File([text], name, { type: 'text/csv' })

const execution = (overrides: object = {}) => ({
  id: 5,
  instanceId: 5,
  jobName: 'productImport',
  status: 'COMPLETED',
  exitCode: 'COMPLETED',
  failureMessage: '',
  readCount: 2,
  writeCount: 1,
  skipCount: 1,
  startTime: '2026-10-08T10:00:00Z',
  endTime: '2026-10-08T10:00:01Z',
  steps: [],
  ...overrides,
})

// The admin console is a lazy route: load it outside the first test's clock (web KI-029).
beforeAll(preloadAdminConsole)

describe('importing a CSV', () => {
  beforeEach(() => {
    vi.mocked(importProducts).mockReset()
    vi.mocked(restartImport).mockReset()
  })

  it('puts the file in the multipart field "file"', () => {
    const file = csv(`${HEADER}\nA,b,1.00,1,C`)
    expect(importForm(file).get('file')).toBe(file)
  })

  it('refuses a wrong header before anything is sent', async () => {
    const user = userEvent.setup()
    renderRoute('/admin/import', { signedInAs: 'ADMIN' })

    await user.upload(await screen.findByLabelText('CSV file'), csv('name,price\nA,1'))
    expect(await screen.findByText('This file cannot be imported')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Import/ })).not.toBeInTheDocument()
    expect(importProducts).not.toHaveBeenCalled()
  })

  it('previews the rows, uploads the chosen file, and reports skipCount and the error file', async () => {
    vi.mocked(importProducts).mockResolvedValue({
      execution: execution(),
      inputFile: '/tmp/in.csv',
      errorFile: '/tmp/err.csv',
    })
    const user = userEvent.setup()
    renderRoute('/admin/import', { signedInAs: 'ADMIN' })

    const file = csv(`${HEADER}\nMouse,Wireless,799.00,10,PERIPHERALS\nBad,row,abc,x,`)
    await user.upload(await screen.findByLabelText('CSV file'), file)
    expect(await screen.findByText('Mouse')).toBeInTheDocument()
    expect(importProducts).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Import 2 rows' }))

    expect(await screen.findByText('The import finished.')).toBeInTheDocument()
    expect(vi.mocked(importProducts).mock.calls[0]?.[0]).toBe(file)
    const facts = screen.getByText('Skipped').closest('div')!
    expect(within(facts).getByText('1')).toBeInTheDocument()
    expect(screen.getByText('/tmp/err.csv')).toBeInTheDocument()
  })

  it('shows a failed run and restarts it', async () => {
    vi.mocked(importProducts).mockResolvedValue({
      execution: execution({ status: 'FAILED', failureMessage: 'Too many skips' }),
      inputFile: 'i',
      errorFile: 'e',
    })
    vi.mocked(restartImport).mockResolvedValue({
      execution: execution({ skipCount: 0 }),
      inputFile: 'i',
      errorFile: 'e',
    })
    const user = userEvent.setup()
    renderRoute('/admin/import', { signedInAs: 'ADMIN' })

    await user.upload(await screen.findByLabelText('CSV file'), csv(`${HEADER}\nA,b,1.00,1,C`))
    await user.click(await screen.findByRole('button', { name: 'Import 1 rows' }))
    expect(await screen.findByText('The import ended as FAILED.')).toBeInTheDocument()
    expect(screen.getByText('Too many skips')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Restart this import' }))
    expect(await screen.findByText('The import finished.')).toBeInTheDocument()
    expect(restartImport).toHaveBeenCalledWith(5)
  })

  it('shows the server error when the upload is refused', async () => {
    vi.mocked(importProducts).mockRejectedValue(
      new ApiError({ status: 400, message: 'Not a CSV file', correlationId: null }),
    )
    const user = userEvent.setup()
    renderRoute('/admin/import', { signedInAs: 'ADMIN' })

    await user.upload(await screen.findByLabelText('CSV file'), csv(`${HEADER}\nA,b,1.00,1,C`))
    await user.click(await screen.findByRole('button', { name: 'Import 1 rows' }))
    expect(await screen.findByText('Not a CSV file')).toBeInTheDocument()
  })

  it('shows a reference for a server failure, a plain sentence for anything else, and short rows without a crash', async () => {
    const user = userEvent.setup()
    renderRoute('/admin/import', { signedInAs: 'ADMIN' })
    const input = await screen.findByLabelText('CSV file')

    vi.mocked(importProducts).mockRejectedValueOnce(
      new ApiError({ status: 500, message: 'Import crashed', correlationId: 'ref-1234567890' }),
    )
    await user.upload(
      input,
      new File(['name,description,price,stock_quantity,category\nShort,row'], 'a.csv', { type: 'text/csv' }),
    )
    await user.click(await screen.findByRole('button', { name: 'Import 1 rows' }))
    expect(await screen.findByText('ref-1234567890')).toBeInTheDocument()

    vi.mocked(importProducts).mockRejectedValueOnce('not an error')
    await user.click(screen.getByRole('button', { name: 'Import 1 rows' }))
    expect(await screen.findByText('The import did not run.')).toBeInTheDocument()

    vi.mocked(importProducts).mockResolvedValueOnce({
      execution: {
        id: 6,
        instanceId: 6,
        jobName: 'j',
        status: 'COMPLETED',
        exitCode: 'COMPLETED',
        failureMessage: '',
        readCount: 3,
        writeCount: 1,
        skipCount: 2,
        startTime: '',
        endTime: '',
        steps: [],
      },
      inputFile: 'i',
      errorFile: '/tmp/e.csv',
    })
    await user.click(screen.getByRole('button', { name: 'Import 1 rows' }))
    expect(await screen.findByText(/2 rows were skipped/)).toBeInTheDocument()
  })
})
