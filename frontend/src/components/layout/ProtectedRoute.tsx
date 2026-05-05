import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LoadingState } from '../ui/LoadingState'
import { useAuth } from '../../state/authStore'

type ProtectedRouteProps = {
  children: ReactNode
}

/**
 * Wraps a route that requires an authenticated session. Redirects to /login
 * with a `from` location so users land back on the original page after they
 * authenticate.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <LoadingState label="Restoring your session" />
  }

  if (status !== 'authenticated') {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return <>{children}</>
}
