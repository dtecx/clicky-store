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
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lg hover:shadow-stone-400/15',
      )}
    >
      <Link
        aria-label={`View ${product.name}`}
        className="relative block overflow-hidden bg-stone-50"
        to={detailHref}
      >
        <div className="absolute left-3 top-3 z-10">
          <Badge variant={stock.variant}>{stock.label}</Badge>
        </div>
        <div className="aspect-square w-full">
          <img
            alt={imageAlt}
            className="h-full w-full object-contain p-6 transition-transform duration-300 ease-out group-hover:scale-105"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.src = fallbackProductImageUrl
            }}
            src={imageUrl}
          />
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
            {product.category}
            {dpiLabel ? ` · ${dpiLabel}` : ''}
          </p>
          <Link
            className="block text-base font-semibold text-slate-900 transition-colors group-hover:text-emerald-700"
            to={detailHref}
          >
            <span className="line-clamp-2">{product.name}</span>
          </Link>
        </div>

        {traits.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {traits.map((trait) => (
              <span
                className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                key={trait}
              >
                {trait}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex flex-col gap-3 pt-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Price
            </p>
            <p className="mt-0.5 text-xl font-bold text-slate-900">
              {formatCents(product.priceCents, product.currency)}
            </p>
          </div>
          {isSoldOut ? (
            <Link
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-stone-50 sm:w-auto"
              to={detailHref}
            >
              Notify me
              <ArrowRight aria-hidden="true" size={14} />
            </Link>
          ) : (
            <Button
              aria-label={`Add ${product.name} to cart`}
              className="w-full sm:w-auto"
              disabled={isAdding}
              leftIcon={<ShoppingCart aria-hidden="true" size={16} />}
              onClick={handleAdd}
              size="sm"
              type="button"
            >
              {isAdding ? 'Adding…' : 'Add to cart'}
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
