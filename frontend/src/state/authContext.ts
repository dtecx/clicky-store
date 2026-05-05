import { createContext } from 'react'
import type { LoginRequest, RegisterRequest, User } from '../types/user'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export type AuthContextValue = {
  status: AuthStatus
  user: User | null
  token: string | null
  isAdmin: boolean
  login(payload: LoginRequest): Promise<User>
  register(payload: RegisterRequest): Promise<User>
  logout(): void
  refresh(): Promise<void>
}

/**
 * Authentication context. Lives in its own module so the provider file can
 * stay component-only — required for React Fast Refresh / lint
 * (`react-refresh/only-export-components`).
 */
export const AuthContext = createContext<AuthContextValue | null>(null)
