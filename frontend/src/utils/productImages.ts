import type { Product } from '../types/product'

export const fallbackProductImageUrl = '/assets/products/product-generic.svg'

/**
 * A single entry in a product image gallery. Carries enough information to
 * render an `<img>` with accessible alt text without leaking backend ids.
 */
export type ProductGalleryEntry = {
  url: string
  altText: string
}

export function primaryProductImageUrl(
  product: Pick<Product, 'imageUrl' | 'images'>,
  fallback = fallbackProductImageUrl,
): string {
  const images = product.images ?? []
  const primaryImage = images.find((image) => image.isPrimary) ?? images[0]

  return primaryImage?.url || product.imageUrl || fallback
}

/**
 * Resolve accessible alt text for a product thumbnail/card image. Falls back
 * to the product name when the admin hasn't supplied custom alt text.
 */
export function primaryProductImageAlt(
  product: Pick<Product, 'name' | 'images'>,
): string {
  const images = product.images ?? []
  const primaryImage = images.find((image) => image.isPrimary) ?? images[0]
  const altText = primaryImage?.altText?.trim()
  return altText || product.name
}

/**
 * Build the ordered list of gallery entries shown on storefront pages.
 *
 * Priority:
 * 1. Sorted, primary-first product images uploaded through the admin UI.
 * 2. Legacy `imageUrl` compatibility fallback when no gallery rows exist.
 * 3. Generic placeholder asset so layouts always have something to render.
 *
 * Returned entries are de-duplicated by URL while preserving the first
 * occurrence's alt text.
 */
export function productGalleryEntries(
  product: Pick<Product, 'name' | 'imageUrl' | 'images'>,
): ProductGalleryEntry[] {
  const sorted = [...(product.images ?? [])].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) {
      return a.isPrimary ? -1 : 1
    }
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder
    }
    return a.createdAt.localeCompare(b.createdAt)
  })

  const entries: ProductGalleryEntry[] = []
  const seenUrls = new Set<string>()

  for (const image of sorted) {
    if (!image.url || seenUrls.has(image.url)) {
      continue
    }
    seenUrls.add(image.url)
    entries.push({
      url: image.url,
      altText: image.altText?.trim() || product.name,
    })
  }

  if (entries.length === 0 && product.imageUrl) {
    entries.push({ url: product.imageUrl, altText: product.name })
    seenUrls.add(product.imageUrl)
  }

  if (entries.length === 0) {
    entries.push({ url: fallbackProductImageUrl, altText: product.name })
  }

  return entries
}

/**
 * @deprecated Prefer {@link productGalleryEntries}. Kept for callers that
 * only need raw URLs.
 */
export function productGalleryImageUrls(product: Product): string[] {
  return productGalleryEntries(product).map((entry) => entry.url)
}
