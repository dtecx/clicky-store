import { Minus, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CartLine as CartLineType } from '../../types/cart'
import { formatCents } from '../../utils/money'

const fallbackImageUrl = '/assets/products/product-generic.svg'

type CartLineProps = {
  line: CartLineType
  isPending?: boolean
  onQuantityChange(quantity: number): void
  onRemove(): void
}

export function CartLine({
  line,
  isPending = false,
  onQuantityChange,
  onRemove,
}: CartLineProps) {
  const { product } = line
  const canDecrease = line.quantity > 1 && !isPending
  const canIncrease = line.quantity < product.stock && !isPending

  return (
    <article className="grid gap-4 border-b border-stone-200 p-4 last:border-b-0 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:p-5">
      <Link
        aria-label={`View ${product.name}`}
        className="flex aspect-square w-28 items-center justify-center rounded-lg bg-stone-50 p-3"
        to={`/products/${product.slug}`}
      >
        <img
          alt={product.name}
          className="h-full w-full object-contain"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = fallbackImageUrl
          }}
          src={product.imageUrl || fallbackImageUrl}
        />
      </Link>

      <div className="min-w-0">
        <Link
          className="text-lg font-bold text-slate-950 hover:text-emerald-800"
          to={`/products/${product.slug}`}
        >
          {product.name}
        </Link>
        <p className="mt-1 text-sm capitalize text-slate-600">{product.category}</p>
        <p className="mt-3 text-sm text-slate-600">
          {formatCents(product.priceCents, product.currency)} each
        </p>
        {line.quantity >= product.stock ? (
          <p className="mt-2 text-xs font-semibold text-amber-800">
            Max stock selected
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
        <p className="text-lg font-bold text-slate-950">
          {formatCents(line.subtotalCents, product.currency)}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex h-10 items-center rounded-lg border border-stone-300 bg-white">
            <button
              aria-label={`Decrease ${product.name} quantity`}
              className="flex h-10 w-10 items-center justify-center text-slate-700 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300"
              disabled={!canDecrease}
              onClick={() => onQuantityChange(line.quantity - 1)}
              type="button"
            >
              <Minus aria-hidden="true" size={16} />
            </button>
            <span className="w-9 text-center text-sm font-semibold">{line.quantity}</span>
            <button
              aria-label={`Increase ${product.name} quantity`}
              className="flex h-10 w-10 items-center justify-center text-slate-700 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300"
              disabled={!canIncrease}
              onClick={() => onQuantityChange(line.quantity + 1)}
              type="button"
            >
              <Plus aria-hidden="true" size={16} />
            </button>
          </div>
          <button
            aria-label={`Remove ${product.name}`}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={onRemove}
            type="button"
          >
            <Trash2 aria-hidden="true" size={17} />
          </button>
        </div>
      </div>
    </article>
  )
}
