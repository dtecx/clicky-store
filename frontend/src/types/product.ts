/**
 * Product shape returned by the API. Matches the Go `domains.Product` struct.
 *
 * Note: `images` is not yet part of the API but will be added in Phase 11.
 * Until then, `imageUrl` carries the single product image.
 */
export type Product = {
  id: string
  name: string
  slug: string
  description: string
  category: string
  priceCents: number
  currency: string
  dpi: number
  wireless: boolean
  ergonomic: boolean
  stock: number
  imageUrl: string
  createdAt: string
  updatedAt: string
}

export type ProductFilter = {
  category?: string
  q?: string
}

/**
 * Payload accepted by `POST /api/v1/admin/products`.
 */
export type CreateProductRequest = {
  name: string
  slug: string
  description: string
  category: string
  priceCents: number
  currency: string
  dpi: number
  wireless: boolean
  ergonomic: boolean
  stock: number
  imageUrl: string
}

/**
 * Payload accepted by `PATCH /api/v1/admin/products/{id}`. Backend treats
 * missing fields as no-ops, so each field is optional.
 */
export type UpdateProductRequest = Partial<CreateProductRequest>
