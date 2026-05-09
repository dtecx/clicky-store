import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import type { Product } from '../../types/product'
import { cn } from '../../utils/cn'
import {
  fallbackProductImageUrl,
  productGalleryEntries,
} from '../../utils/productImages'
import { Card } from '../ui/Card'

type ProductGalleryProps = {
  product: Pick<Product, 'name' | 'imageUrl' | 'images'>
  className?: string
}

/**
 * Customer-facing product gallery: renders a large main image and a row of
 * thumbnail buttons that swap the main image when activated. Falls back to
 * the legacy `imageUrl` and the generic placeholder asset so older catalog
 * data keeps rendering.
 */
export function ProductGallery({ product, className }: ProductGalleryProps) {
  const entries = useMemo(() => productGalleryEntries(product), [product])
  const [activeIndex, setActiveIndex] = useState(0)

  // If the upstream product changes (e.g., admin updates fire while the page
  // is open) snap back to the primary image instead of holding a stale index.
  useEffect(() => {
    setActiveIndex(0)
  }, [entries])

  const safeIndex = Math.min(Math.max(activeIndex, 0), Math.max(entries.length - 1, 0))
  const activeEntry = entries[safeIndex] ?? {
    url: fallbackProductImageUrl,
    altText: product.name,
  }
  const hasMultiple = entries.length > 1

  function handleThumbKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!hasMultiple) {
      return
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index + 1) % entries.length)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index - 1 + entries.length) % entries.length)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(entries.length - 1)
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      <Card className="flex min-h-[26rem] items-center justify-center bg-white p-6">
        <img
          alt={activeEntry.altText || product.name}
          className="max-h-[22rem] w-full object-contain"
          onError={(event) => {
            event.currentTarget.src = fallbackProductImageUrl
          }}
          src={activeEntry.url}
        />
      </Card>
      {hasMultiple ? (
        <div
          aria-label={`${product.name} image gallery`}
          className="grid grid-cols-4 gap-3 sm:grid-cols-5"
          role="group"
        >
          {entries.map((entry, index) => {
            const isActive = index === safeIndex
            return (
              <button
                aria-current={isActive ? 'true' : undefined}
                aria-label={`Show image ${index + 1} of ${entries.length}: ${entry.altText || product.name}`}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-lg border bg-white p-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 focus-visible:ring-offset-2',
                  isActive
                    ? 'border-emerald-700 ring-2 ring-emerald-700/30'
                    : 'border-stone-300 hover:border-emerald-700',
                )}
                key={`${entry.url}-${index}`}
                onClick={() => setActiveIndex(index)}
                onKeyDown={(event) => handleThumbKey(event, index)}
                type="button"
              >
                <img
                  alt=""
                  className="h-full w-full object-contain"
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src = fallbackProductImageUrl
                  }}
                  src={entry.url}
                />
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
