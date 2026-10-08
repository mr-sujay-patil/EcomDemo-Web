import { z } from 'zod'
import type { ProductRequest } from './products'

// The rules of `ProductRequest` (integration guide, "Admin console APIs"). They run in the browser for speed; the backend
// checks again and its 400 is shown on the field (`applyServerErrors`). The form holds text, because an input does, and
// the schema turns it into the request: the price is never computed on, only checked and passed on as typed.

export const NAME_MAX = 255
export const DESCRIPTION_MAX = 1000
export const CATEGORY_MAX = 50

const price = z
  .string()
  .trim()
  .min(1, 'Enter a price.')
  .regex(/^\d+(\.\d{1,2})?$/, 'Use rupees with at most two decimals, like 8999.50.')
  .refine((value) => Number(value) >= 0.01, 'The price must be at least 0.01.')

const wholeNumber = (empty: string) =>
  z
    .string()
    .trim()
    .min(1, empty)
    .regex(/^\d+$/, 'Use a whole number, 0 or more.')
    .refine(
      (value) => Number.isSafeInteger(Number(value)) && Number(value) <= 2_147_483_647,
      'That number is too large.',
    )

export const productSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(NAME_MAX, `Use at most ${NAME_MAX} characters.`),
  description: z.string().max(DESCRIPTION_MAX, `Use at most ${DESCRIPTION_MAX} characters.`),
  price,
  stockQuantity: wholeNumber('Enter a stock level, 0 or more.'),
  category: z.string().trim().max(CATEGORY_MAX, `Use at most ${CATEGORY_MAX} characters.`),
})
export type ProductValues = z.infer<typeof productSchema>

export const productLabels = {
  name: 'Name',
  description: 'Description',
  price: 'Price',
  stockQuantity: 'Stock',
  category: 'Category',
} as const

/** The request for a valid form. An empty category is left out, as the guide allows. */
export function toRequest(values: ProductValues): ProductRequest {
  const category = values.category.trim()
  return {
    name: values.name.trim(),
    description: values.description,
    price: Number(values.price),
    stockQuantity: Number(values.stockQuantity),
    ...(category ? { category } : {}),
  }
}

export function toValues(product?: {
  name: string
  description: string
  price: number
  stockQuantity: number
  category: string | null
}): ProductValues {
  return {
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product ? String(product.price) : '',
    stockQuantity: product ? String(product.stockQuantity) : '',
    category: product?.category ?? '',
  }
}
