import type { Cart } from '../../types/cart'
import { formatCents } from '../../utils/money'
import {
  fallbackProductImageUrl,
  primaryProductImageUrl,
} from '../../utils/productImages'
import { Card } from '../ui/Card'

type CheckoutSummaryProps = {
  cart: Cart
}

export function CheckoutSummary({ cart }: CheckoutSummaryProps) {
  const itemCount = cart.items.reduce((total, line) => total + line.quantity, 0)

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-stone-200 bg-stone-50 px-5 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
          Review items
        </h2>
      </div>
      <ul className="divide-y divide-stone-200">
        {cart.items.map((line) => {
          const imageUrl = primaryProductImageUrl(line.product)
          return (
            <li
              className="flex items-center gap-3 px-5 py-4"
              key={line.product.id}
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-stone-50 p-2">
                <img
                  alt=""
                  className="h-full w-full object-contain"
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src = fallbackProductImageUrl
                  }}
                  src={imageUrl}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-950">
                  {line.product.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">Qty {line.quantity}</p>
              </div>
              <p className="text-sm font-bold text-slate-950">
                {formatCents(line.subtotalCents, line.product.currency)}
              </p>
            </li>
          )
        })}
      </ul>
      <dl className="space-y-3 border-t border-stone-200 px-5 py-5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-600">Items</dt>
          <dd className="font-semibold text-slate-950">{itemCount}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-600">Shipping</dt>
          <dd className="font-semibold text-emerald-800">Free</dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-stone-200 pt-3">
          <dt className="text-base font-bold text-slate-950">Total</dt>
          <dd className="text-2xl font-bold text-slate-950">
            {formatCents(cart.totalCents, cart.currency)}
          </dd>
        </div>
      </dl>
    </Card>
  )
}
