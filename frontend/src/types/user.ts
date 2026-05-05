import type { UserRole } from './api'

/**
 * User shape returned by the API. Matches the Go `domains.User` struct minus
 * password fields, which are never serialized.
 */
export type User = {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: string
}

/**
 * Filter options accepted by `GET /api/v1/admin/users`.
 */
export type UserFilter = {
  role?: UserRole | ''
  q?: string
}

export type RegisterRequest = {
  name: string
  email: string
  password: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type AuthResponse = {
  user: User
  token: string
}
