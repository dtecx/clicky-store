import { createContext } from 'react'
import type { Cart } from '../types/cart'

export type CartStatus = 'idle' | 'loading' | 'ready' | 'error'

export type CartContextValue = {
  cart: Cart | null
  error: string | null
  itemCount: number
  status: CartStatus
  refresh(): Promise<Cart | null>
  addItem(productId: string, quantity: number): Promise<Cart>
  setQuantity(productId: string, quantity: number): Promise<Cart>
  removeItem(productId: string): Promise<Cart>
}

export const CartContext = createContext<CartContextValue | null>(null)
