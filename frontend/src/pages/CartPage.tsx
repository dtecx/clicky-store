import { ArrowLeft, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { CartLine } from '../components/cart/CartLine'
import { CartSummary } from '../components/cart/CartSummary'
import { PageShell } from '../components/layout/PageShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LinkButton } from '../components/ui/LinkButton'
import { LoadingState } from '../components/ui/LoadingState'
import { useCart } from '../state/useCart'
import { errorMessage } from '../utils/errors'

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
          action={
            <Button onClick={() => void refresh()} variant="secondary">
              Try again
            </Button>
          }
          message={error ?? 'Could not load cart.'}
          title="Cart unavailable"
        />
      </PageShell>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <PageShell title="Your cart">
        <EmptyState
          action={<LinkButton to="/">Continue shopping</LinkButton>}
          icon={<ShoppingBag aria-hidden="true" size={24} />}
          title="Your cart is empty"
        >
          Add a mouse from the catalog and it'll show up here, ready to check out.
        </EmptyState>
      </PageShell>
    )
  }

  return (
    <PageShell
      description={`${itemCount} ${itemCount === 1 ? 'item' : 'items'} ready to check out.`}
      title="Your cart"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          {actionError ? (
            <ErrorState message={actionError} title="Cart update failed" />
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
          <LinkButton
            leftIcon={<ArrowLeft aria-hidden="true" size={16} />}
            to="/"
            variant="ghost"
          >
            Keep shopping
          </LinkButton>
        </div>
        <aside className="lg:sticky lg:top-32">
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
