import type { Product } from '../types/product'

export const fallbackProductImageUrl = '/assets/products/product-generic.svg'

export function primaryProductImageUrl(
  product: Pick<Product, 'imageUrl' | 'images'>,
  fallback = fallbackProductImageUrl,
): string {
  const images = product.images ?? []
  const primaryImage = images.find((image) => image.isPrimary) ?? images[0]

  return primaryImage?.url || product.imageUrl || fallback
}

export function productGalleryImageUrls(product: Product): string[] {
  const imageUrls = (product.images ?? [])
    .map((image) => image.url)
    .filter((url): url is string => Boolean(url))

  if (product.imageUrl && !imageUrls.includes(product.imageUrl)) {
    imageUrls.unshift(product.imageUrl)
  }

  return imageUrls.length > 0 ? imageUrls : [fallbackProductImageUrl]
}
