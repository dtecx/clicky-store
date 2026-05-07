import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as cartApi from '../api/cart'
import type { Cart } from '../types/cart'
import { errorMessage } from '../utils/errors'
import {
  CartContext,
  type CartContextValue,
  type CartStatus,
} from './cartContext'
import { useAuth } from './useAuth'

type CartProviderProps = {
  children: ReactNode
}

export function CartProvider({ children }: CartProviderProps) {
  const { status: authStatus, token } = useAuth()
  const [cart, setCart] = useState<Cart | null>(null)
  const [status, setStatus] = useState<CartStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const applyCart = useCallback((nextCart: Cart) => {
    setCart(nextCart)
    setError(null)
    setStatus('ready')
    return nextCart
  }, [])

  const clearCart = useCallback(() => {
    setCart(null)
    setError(null)
    setStatus('idle')
  }, [])

  const refresh = useCallback(async () => {
    if (authStatus !== 'authenticated') {
      clearCart()
      return null
    }

    setStatus('loading')
    setError(null)
    try {
      return applyCart(await cartApi.getCart())
    } catch (err) {
      const message = errorMessage(err)
      setError(message)
      setStatus('error')
      throw err
    }
  }, [applyCart, authStatus, clearCart])

  useEffect(() => {
    if (authStatus === 'loading') {
      setStatus('loading')
      return
    }

    if (authStatus !== 'authenticated') {
      clearCart()
      return
    }

    let cancelled = false
    setStatus('loading')
    setError(null)
    cartApi
      .getCart()
      .then((nextCart) => {
        if (!cancelled) {
          applyCart(nextCart)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(errorMessage(err))
          setStatus('error')
        }
      })

    return () => {
      cancelled = true
    }
  }, [applyCart, authStatus, clearCart, token])

  const addItem = useCallback(
    async (productId: string, quantity: number) => {
      try {
        return applyCart(await cartApi.addCartItem(productId, quantity))
      } catch (err) {
        setError(errorMessage(err))
        throw err
      }
    },
    [applyCart],
  )

  const setQuantity = useCallback(
    async (productId: string, quantity: number) => {
      try {
        return applyCart(await cartApi.setCartItemQuantity(productId, quantity))
      } catch (err) {
        setError(errorMessage(err))
        throw err
      }
    },
    [applyCart],
  )

  const removeItem = useCallback(
    async (productId: string) => {
      try {
        return applyCart(await cartApi.removeCartItem(productId))
      } catch (err) {
        setError(errorMessage(err))
        throw err
      }
    },
    [applyCart],
  )

  const itemCount = useMemo(
    () => cart?.items.reduce((total, line) => total + line.quantity, 0) ?? 0,
    [cart],
  )

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      error,
      itemCount,
      status,
      refresh,
      addItem,
      setQuantity,
      removeItem,
    }),
    [addItem, cart, error, itemCount, refresh, removeItem, setQuantity, status],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
