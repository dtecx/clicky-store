import type { Product, ProductFilter } from '../types/product'
import { apiFetch } from './client'

type RequestExtras = {
  signal?: AbortSignal
}

export async function listProducts(
  filter: ProductFilter = {},
  extras: RequestExtras = {},
): Promise<Product[]> {
  const data = await apiFetch<{ products: Product[] }>('/products', {
    query: { category: filter.category, q: filter.q },
    signal: extras.signal,
  })
  return data.products ?? []
}

export async function getProduct(
  productId: string,
  extras: RequestExtras = {},
): Promise<Product> {
  const data = await apiFetch<{ product: Product }>(
    `/products/${encodeURIComponent(productId)}`,
    { signal: extras.signal },
  )
  return data.product
}
