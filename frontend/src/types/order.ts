import type { OrderStatus, PaymentStatus } from './api'

export type OrderItem = {
  productId: string
  name: string
  quantity: number
  unitPriceCents: number
  subtotalCents: number
}

export type Order = {
  id: string
  userId: string
  items: OrderItem[]
  totalCents: number
  currency: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: string
  createdAt: string
}
