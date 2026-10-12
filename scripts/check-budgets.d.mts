export const budgets: { chunkKB: number; shelfScriptKB: number; shelfFiles: number }
export const notOnShelf: { what: string; test: RegExp }[]
export function checkBudgets(
  files: Map<string, Uint8Array>,
  indexHtml: string,
  chunkModules?: Record<string, string[]>,
): { chunks: { path: string; bytes: number }[]; shelf: string[]; shelfBytes: number; failures: string[] }
