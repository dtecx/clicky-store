import type { PaymentSimulationResult } from '../types/api'
import type { Order } from '../types/order'
import { apiFetch } from './client'

export async function listOrders(): Promise<Order[]> {
  const data = await apiFetch<{ orders: Order[] }>('/orders')
  return data.orders ?? []
}

export async function createOrder(paymentMethod: string): Promise<Order> {
  const data = await apiFetch<{ order: Order }>('/orders', {
    method: 'POST',
    body: { paymentMethod },
  })
  return data.order
}

export async function simulateOrderPayment(
  orderId: string,
  result: PaymentSimulationResult,
): Promise<Order> {
  const data = await apiFetch<{ order: Order }>(
    `/orders/${encodeURIComponent(orderId)}/payment/simulate`,
    {
      method: 'POST',
      body: { result },
    },
  )
  return data.order
}
