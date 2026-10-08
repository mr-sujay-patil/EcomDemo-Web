export const budgets: { chunkKB: number; shelfScriptKB: number }
export function checkBudgets(
  files: Map<string, Uint8Array>,
  indexHtml: string,
): { chunks: { path: string; bytes: number }[]; shelf: string[]; shelfBytes: number; failures: string[] }
