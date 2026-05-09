import { ArrowRight, ShieldCheck, Truck } from 'lucide-react'
import { Card } from '../ui/Card'
import { LinkButton } from '../ui/LinkButton'
import { formatCents } from '../../utils/money'

type CartSummaryProps = {
  currency: string
  itemCount: number
  totalCents: number
  checkoutHref?: string
}

export function CartSummary({
  currency,
  itemCount,
  totalCents,
  checkoutHref = '/checkout',
}: CartSummaryProps) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-stone-200 bg-stone-50 px-5 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
          Order summary
        </h2>
      </div>
      <div className="space-y-4 p-5">
        <dl className="space-y-3 text-sm">
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
              {formatCents(totalCents, currency)}
            </dd>
          </div>
        </dl>
        <LinkButton
          className="w-full"
          rightIcon={<ArrowRight aria-hidden="true" size={18} />}
          size="lg"
          to={checkoutHref}
        >
          Checkout securely
        </LinkButton>
        <ul className="space-y-2 border-t border-stone-200 pt-4 text-xs text-slate-600">
          <li className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Truck aria-hidden="true" size={14} />
            </span>
            Same-day dispatch on weekday orders before 14:00.
          </li>
          <li className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <ShieldCheck aria-hidden="true" size={14} />
            </span>
            14-day no-questions return window.
          </li>
        </ul>
      </div>
    </Card>
  )
}
