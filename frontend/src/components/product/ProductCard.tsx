import { ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Product } from '../../types/product'
import { formatCents } from '../../utils/money'
import {
  fallbackProductImageUrl,
  primaryProductImageAlt,
  primaryProductImageUrl,
} from '../../utils/productImages'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

type ProductCardProps = {
  /** Product to display. */
  product: Product
  /** Called when the customer presses the quick add-to-cart button. */
  onAddToCart?: (product: Product) => void
  /** Disables the add-to-cart button (e.g., while a request is pending). */
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
  const traits = [
    product.wireless ? 'Wireless' : 'Wired',
    product.ergonomic ? 'Ergonomic' : null,
  ].filter((trait): trait is string => Boolean(trait))

  function handleAdd() {
    onAddToCart?.(product)
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <Link
        aria-label={`View ${product.name}`}
        className="block bg-stone-50 p-5"
        to={detailHref}
      >
        <img
          alt={imageAlt}
          className="mx-auto aspect-square h-44 w-full max-w-56 object-contain"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = fallbackProductImageUrl
          }}
          src={imageUrl}
        />
      </Link>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              className="block truncate text-lg font-bold text-slate-950 hover:text-emerald-800"
              to={detailHref}
            >
              {product.name}
            </Link>
            <p className="mt-1 text-sm capitalize text-slate-600">
              {product.category}
              {formatDpi(product.dpi) ? ` · ${formatDpi(product.dpi)}` : ''}
            </p>
          </div>
          <Badge variant={stock.variant}>{stock.label}</Badge>
        </div>

        {traits.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {traits.map((trait) => (
              <Badge key={trait}>{trait}</Badge>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <p className="text-xl font-bold text-slate-950">
            {formatCents(product.priceCents, product.currency)}
          </p>
          <Button
            disabled={product.stock <= 0 || isAdding}
            leftIcon={<ShoppingCart aria-hidden="true" size={17} />}
            onClick={handleAdd}
            size="sm"
            type="button"
          >
            {product.stock <= 0 ? 'Sold out' : isAdding ? 'Adding…' : 'Add'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
