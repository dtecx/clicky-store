import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../types/user'
import { apiFetch } from './client'

export async function register(payload: RegisterRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: payload,
    anonymous: true,
  })
}

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: payload,
    anonymous: true,
  })
}

export async function getCurrentUser(): Promise<User> {
  const data = await apiFetch<{ user: User }>('/me')
  return data.user
}
