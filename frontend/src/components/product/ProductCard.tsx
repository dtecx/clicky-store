import { ArrowRight, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Product } from '../../types/product'
import { cn } from '../../utils/cn'
import { formatCents } from '../../utils/money'
import {
  fallbackProductImageUrl,
  primaryProductImageAlt,
  primaryProductImageUrl,
} from '../../utils/productImages'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

type ProductCardProps = {
  product: Product
  onAddToCart?: (product: Product) => void
  isAdding?: boolean
}

function stockBadge(stock: number) {
  if (stock <= 0) {
    return { label: 'Out of stock', variant: 'danger' as const }
  }
  if (stock <= 5) {
    return { label: `Only ${stock} left`, variant: 'warning' as const }
  }
  return { label: 'In stock', variant: 'success' as const }
}

function formatDpi(dpi: number): string {
  if (!Number.isFinite(dpi) || dpi <= 0) {
    return ''
  }
  if (dpi >= 1000 && dpi % 1000 === 0) {
    return `${dpi / 1000}K DPI`
  }
  return `${dpi.toLocaleString()} DPI`
}

export function ProductCard({ product, onAddToCart, isAdding }: ProductCardProps) {
  const stock = stockBadge(product.stock)
  const detailHref = `/products/${product.slug}`
  const imageUrl = primaryProductImageUrl(product)
  const imageAlt = primaryProductImageAlt(product)
  const dpiLabel = formatDpi(product.dpi)
  const traits = [
    product.wireless ? 'Wireless' : 'Wired',
    product.ergonomic ? 'Ergonomic' : null,
  ].filter((trait): trait is string => Boolean(trait))
  const isSoldOut = product.stock <= 0

  function handleAdd() {
    if (!isSoldOut) {
      onAddToCart?.(product)
    }
  }

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm shadow-stone-400/10 transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md hover:shadow-stone-400/20',
      )}
    >
      <Link
        aria-label={`View ${product.name}`}
        className="relative block overflow-hidden bg-gradient-to-br from-stone-50 via-white to-stone-100 p-5"
        to={detailHref}
      >
        <div className="absolute left-4 top-4 flex flex-col gap-1.5">
          <Badge variant={stock.variant}>{stock.label}</Badge>
        </div>
        <img
          alt={imageAlt}
          className="mx-auto aspect-square h-44 w-full max-w-56 object-contain transition-transform duration-300 ease-out group-hover:scale-105"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = fallbackProductImageUrl
          }}
          src={imageUrl}
        />
      </Link>
      <div className="flex flex-1 flex-col gap-3 px-5 pb-5 pt-4">
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">
            {product.category}
            {dpiLabel ? ` · ${dpiLabel}` : ''}
          </p>
          <Link
            className="block truncate text-base font-bold text-slate-950 transition-colors group-hover:text-emerald-800"
            to={detailHref}
          >
            {product.name}
          </Link>
        </div>

        {traits.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {traits.map((trait) => (
              <span
                className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                key={trait}
              >
                {trait}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Price
            </p>
            <p className="mt-0.5 text-xl font-bold text-slate-950">
              {formatCents(product.priceCents, product.currency)}
            </p>
          </div>
          {isSoldOut ? (
            <Link
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-xs font-bold uppercase tracking-wide text-slate-700 transition-colors hover:bg-stone-50"
              to={detailHref}
            >
              Notify
              <ArrowRight aria-hidden="true" size={14} />
            </Link>
          ) : (
            <Button
              aria-label={`Add ${product.name} to cart`}
              disabled={isAdding}
              leftIcon={<ShoppingCart aria-hidden="true" size={16} />}
              onClick={handleAdd}
              size="sm"
              type="button"
            >
              {isAdding ? 'Adding…' : 'Add'}
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
