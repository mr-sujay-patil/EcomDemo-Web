export const allowedUrls: RegExp[]
export function checkDist(files: Map<string, Uint8Array>): { failures: string[] }
export function checkInlineScripts(indexHtml: string, securityHeadersConf: string): string[]
export const shelfFirstViewFaces: string[]
export function checkFontPreloads(
  indexHtml: string,
  distPaths: string[],
  securityHeadersConf: string,
  requiredFaces: string[],
): string[]
export function checkFirstViewFontFaces(indexHtml: string, files: Map<string, Uint8Array | string>, allowedFaces: string[]): string[]
