import type { Cart } from '../../types/cart'
import { formatCents } from '../../utils/money'
import { Card } from '../ui/Card'

type CheckoutSummaryProps = {
  cart: Cart
}

export function CheckoutSummary({ cart }: CheckoutSummaryProps) {
  const itemCount = cart.items.reduce((total, line) => total + line.quantity, 0)

  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold text-slate-950">Review items</h2>
      <div className="mt-5 space-y-4">
        {cart.items.map((line) => (
          <div
            className="flex items-start justify-between gap-4 border-b border-stone-200 pb-4 last:border-b-0 last:pb-0"
            key={line.product.id}
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-950">
                {line.product.name}
              </p>
              <p className="mt-1 text-sm text-slate-600">Qty {line.quantity}</p>
            </div>
            <p className="font-semibold text-slate-950">
              {formatCents(line.subtotalCents, line.product.currency)}
            </p>
          </div>
        ))}
      </div>
      <dl className="mt-5 space-y-3 border-t border-stone-200 pt-5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-600">Items</dt>
          <dd className="font-semibold text-slate-950">{itemCount}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="font-semibold text-slate-950">Total</dt>
          <dd className="text-xl font-bold text-slate-950">
            {formatCents(cart.totalCents, cart.currency)}
          </dd>
        </div>
      </dl>
    </Card>
  )
}
