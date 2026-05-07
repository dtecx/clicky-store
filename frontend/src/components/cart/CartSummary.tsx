import { ArrowRight } from 'lucide-react'
import { LinkButton } from '../ui/LinkButton'
import { Card } from '../ui/Card'
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
    <Card className="p-5">
      <h2 className="text-lg font-bold text-slate-950">Order summary</h2>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-600">Items</dt>
          <dd className="font-semibold text-slate-950">{itemCount}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-stone-200 pt-3">
          <dt className="font-semibold text-slate-950">Total</dt>
          <dd className="text-xl font-bold text-slate-950">
            {formatCents(totalCents, currency)}
          </dd>
        </div>
      </dl>
      <LinkButton
        className="mt-5 w-full"
        rightIcon={<ArrowRight aria-hidden="true" size={18} />}
        size="lg"
        to={checkoutHref}
      >
        Checkout
      </LinkButton>
    </Card>
  )
}
