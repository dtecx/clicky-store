import type { UserRole } from '../types/api'
import type { Order } from '../types/order'
import type {
  CreateProductRequest,
  Product,
  ProductFilter,
  UpdateProductRequest,
} from '../types/product'
import type { User, UserFilter } from '../types/user'
import { apiFetch } from './client'

export async function listAdminProducts(filter: ProductFilter = {}): Promise<Product[]> {
  const data = await apiFetch<{ products: Product[] }>('/admin/products', {
    query: { category: filter.category, q: filter.q },
  })
  return data.products ?? []
}

export async function createProduct(payload: CreateProductRequest): Promise<Product> {
  const data = await apiFetch<{ product: Product }>('/admin/products', {
    method: 'POST',
    body: payload,
  })
  return data.product
}

export async function updateProduct(
  productId: string,
  payload: UpdateProductRequest,
): Promise<Product> {
  const data = await apiFetch<{ product: Product }>(
    `/admin/products/${encodeURIComponent(productId)}`,
    {
      method: 'PATCH',
      body: payload,
    },
  )
  return data.product
}

export async function deleteProduct(productId: string): Promise<void> {
  await apiFetch<void>(`/admin/products/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
  })
}

export async function listAdminOrders(): Promise<Order[]> {
  const data = await apiFetch<{ orders: Order[] }>('/admin/orders')
  return data.orders ?? []
}

export async function listAdminUsers(filter: UserFilter = {}): Promise<User[]> {
  const data = await apiFetch<{ users: User[] }>('/admin/users', {
    query: { role: filter.role, q: filter.q },
  })
  return data.users ?? []
}

export async function getAdminUser(userId: string): Promise<User> {
  const data = await apiFetch<{ user: User }>(`/admin/users/${encodeURIComponent(userId)}`)
  return data.user
}

export async function updateUserRole(userId: string, role: UserRole): Promise<User> {
  const data = await apiFetch<{ user: User }>(`/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: { role },
  })
  return data.user
}
