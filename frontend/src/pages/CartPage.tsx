import { ShoppingBag } from 'lucide-react'
import { CartLine } from '../components/cart/CartLine'
import { CartSummary } from '../components/cart/CartSummary'
import { PageShell } from '../components/layout/PageShell'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LinkButton } from '../components/ui/LinkButton'
import { LoadingState } from '../components/ui/LoadingState'
import { useCart } from '../state/useCart'
import { errorMessage } from '../utils/errors'
import { useState } from 'react'

export function CartPage() {
  const { cart, error, itemCount, status, setQuantity, removeItem, refresh } = useCart()
  const [pendingProductId, setPendingProductId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleQuantityChange(productId: string, quantity: number) {
    setPendingProductId(productId)
    setActionError(null)
    try {
      await setQuantity(productId, quantity)
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setPendingProductId(null)
    }
  }

  async function handleRemove(productId: string) {
    setPendingProductId(productId)
    setActionError(null)
    try {
      await removeItem(productId)
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setPendingProductId(null)
    }
  }

  if (status === 'loading' && !cart) {
    return (
      <PageShell title="Cart">
        <LoadingState label="Loading cart" />
      </PageShell>
    )
  }

  if (status === 'error' && !cart) {
    return (
      <PageShell title="Cart">
        <ErrorState
          action={<button className="font-semibold underline" onClick={() => void refresh()} type="button">Try again</button>}
          message={error ?? 'Could not load cart.'}
          title="Cart unavailable"
        />
      </PageShell>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <PageShell title="Cart">
        <EmptyState
          action={<LinkButton to="/">Continue shopping</LinkButton>}
          icon={<ShoppingBag aria-hidden="true" size={22} />}
          title="Your cart is empty"
        >
          No products selected.
        </EmptyState>
      </PageShell>
    )
  }

  return (
    <PageShell title="Cart">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          {actionError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {actionError}
            </div>
          ) : null}
          <Card className="overflow-hidden">
            {cart.items.map((line) => (
              <CartLine
                isPending={pendingProductId === line.product.id}
                key={line.product.id}
                line={line}
                onQuantityChange={(quantity) =>
                  void handleQuantityChange(line.product.id, quantity)
                }
                onRemove={() => void handleRemove(line.product.id)}
              />
            ))}
          </Card>
        </div>
        <aside>
          <CartSummary
            currency={cart.currency}
            itemCount={itemCount}
            totalCents={cart.totalCents}
          />
        </aside>
      </div>
    </PageShell>
  )
}
