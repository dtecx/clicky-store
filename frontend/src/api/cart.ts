import type { Cart } from '../types/cart'
import { apiFetch } from './client'

export async function getCart(): Promise<Cart> {
  const data = await apiFetch<{ cart: Cart }>('/cart')
  return data.cart
}

export async function addCartItem(productId: string, quantity: number): Promise<Cart> {
  const data = await apiFetch<{ cart: Cart }>('/cart/items', {
    method: 'POST',
    body: { productId, quantity },
  })
  return data.cart
}

export async function setCartItemQuantity(productId: string, quantity: number): Promise<Cart> {
  const data = await apiFetch<{ cart: Cart }>(`/cart/items/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    body: { quantity },
  })
  return data.cart
}

export async function removeCartItem(productId: string): Promise<Cart> {
  const data = await apiFetch<{ cart: Cart }>(`/cart/items/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
  })
  return data.cart
}
