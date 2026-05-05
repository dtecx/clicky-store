import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './authContext'

/**
 * Read the current auth context. Throws when used outside an `AuthProvider`,
 * which makes the dependency obvious to callers.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside an <AuthProvider>')
  }
  return ctx
}
