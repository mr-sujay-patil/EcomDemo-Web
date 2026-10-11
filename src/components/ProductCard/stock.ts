/** What the shelf says about stock: a hint, not a promise (checkout still re-checks). */
export const LOW_STOCK = 5

/** How much is left, as the card words it: `none` when the shelf did not say. */
export type StockLevel = 'none' | 'out' | 'low' | 'in'

export function stockLevel(stock: number | undefined): StockLevel {
  if (stock === undefined) return 'none'
  if (stock === 0) return 'out'
  return stock <= LOW_STOCK ? 'low' : 'in'
}

export const STOCK_CLASS: Record<Exclude<StockLevel, 'none'>, string> = { out: 'is-out', low: 'is-low', in: 'is-in' }

export function stockText(level: Exclude<StockLevel, 'none'>, stock: number): string {
  if (level === 'out') return 'Out of stock'
  return level === 'low' ? `Only ${stock} left` : `${stock} in stock`
}

/** The Add to cart button's words: out of stock wins, then what is already in the cart. */
export function addLabel(out: boolean, inCart: number): string {
  if (out) return 'Out of stock'
  return inCart ? `In your cart (${inCart})` : 'Add to cart'
}
