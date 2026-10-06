export type StockRefusal = { productName: string; requested: number; available: number }

/**
 * Reads the backend's 409 "Insufficient stock for 'Mouse': requested 3, available 2" so the message can sit
 * by the line it is about. Anything else (including the empty-cart 409) returns null and is shown on top.
 */
export function parseStockRefusal(message: string): StockRefusal | null {
  const match = /^Insufficient stock for '(.+)': requested (\d+), available (\d+)$/.exec(message)
  if (!match) return null
  return { productName: match[1]!, requested: Number(match[2]), available: Number(match[3]) }
}
