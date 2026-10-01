const priceFormat = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

/** Shows a price the server sent. Never add or round prices in JS: totals come from the server (`lineTotal`, `totalAmount`). */
export function formatPrice(amount: number): string {
  return priceFormat.format(amount)
}
