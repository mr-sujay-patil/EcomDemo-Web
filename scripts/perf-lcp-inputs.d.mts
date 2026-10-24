export interface LcpInputs {
  fcp: number
  lcp: number
  before: number
  total: number
  byType: { type: string; count: number; bytes: number }[]
  data: string[]
  domElements: number | undefined
}
export function lcpInputs(run: unknown): LcpInputs
export function describeLcpInputs(path: string, inputs: LcpInputs): string
