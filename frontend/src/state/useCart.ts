import { useContext } from 'react'
import { CartContext, type CartContextValue } from './cartContext'

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used inside a <CartProvider>')
  }
  return ctx
}
