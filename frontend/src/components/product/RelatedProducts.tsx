import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Product } from '../../types/product'
import { formatCents } from '../../utils/money'
import {
  fallbackProductImageUrl,
  primaryProductImageAlt,
  primaryProductImageUrl,
} from '../../utils/productImages'

type RelatedProductsProps = {
  category: string
  products: Product[]
}

/**
 * Compact grid of related products shown beneath the product detail page.
 * Renders nothing when no related items exist, so callers can drop it in
 * unconditionally.
 */
export function RelatedProducts({ category, products }: RelatedProductsProps) {
  if (products.length === 0) {
    return null
  }

  return (
    <section className="mt-16 border-t border-stone-200 pt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
            You might also like
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            More <span className="capitalize">{category}</span> picks
          </h2>
        </div>
        <Link
          className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 transition-colors hover:text-emerald-700"
          to={`/?category=${category}`}
        >
          See all <ArrowRight aria-hidden="true" size={15} />
        </Link>
      </div>
      <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <li key={product.id}>
            <RelatedProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function RelatedProductCard({ product }: { product: Product }) {
  const detailHref = `/products/${product.slug}`
  const imageUrl = primaryProductImageUrl(product)
  const imageAlt = primaryProductImageAlt(product)
  const isSoldOut = product.stock <= 0

  return (
    <Link
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm shadow-stone-400/10 transition-all duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md hover:shadow-stone-400/20"
      to={detailHref}
    >
      <div className="relative bg-gradient-to-br from-stone-50 via-white to-stone-100 p-4">
        <img
          alt={imageAlt}
          className="mx-auto aspect-square h-32 w-full max-w-44 object-contain transition-transform duration-300 ease-out group-hover:scale-105"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = fallbackProductImageUrl
          }}
          src={imageUrl}
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">
          {product.category}
        </p>
        <p className="truncate text-sm font-bold text-slate-950 transition-colors group-hover:text-emerald-800">
          {product.name}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <p className="text-base font-bold text-slate-950">
            {formatCents(product.priceCents, product.currency)}
          </p>
          <span
            className={
              isSoldOut
                ? 'text-[11px] font-bold uppercase tracking-wide text-red-600'
                : 'text-[11px] font-bold uppercase tracking-wide text-emerald-700'
            }
          >
            {isSoldOut ? 'Sold out' : 'In stock'}
          </span>
        </div>
      </div>
    </Link>
  )
}
