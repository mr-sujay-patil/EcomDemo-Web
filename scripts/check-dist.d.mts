export const allowedUrls: RegExp[]
export function checkDist(files: Map<string, Uint8Array>): { failures: string[] }
export function checkInlineScripts(indexHtml: string, securityHeadersConf: string): string[]
