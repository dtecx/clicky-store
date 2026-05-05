import type { Product, ProductFilter } from '../types/product'
import { apiFetch } from './client'

export async function listProducts(filter: ProductFilter = {}): Promise<Product[]> {
  const data = await apiFetch<{ products: Product[] }>('/products', {
    query: { category: filter.category, q: filter.q },
  })
  return data.products ?? []
}

export async function getProduct(productId: string): Promise<Product> {
  const data = await apiFetch<{ product: Product }>(`/products/${encodeURIComponent(productId)}`)
  return data.product
}
