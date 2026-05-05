import type { Product } from './product'

export type CartLine = {
  product: Product
  quantity: number
  subtotalCents: number
}

export type Cart = {
  userId: string
  items: CartLine[]
  totalCents: number
  currency: string
}
