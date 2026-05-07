import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LoadingState } from '../ui/LoadingState'
import { useAuth } from '../../state/useAuth'

type AdminRouteProps = {
  children: ReactNode
}

/**
 * Wraps a route that requires an admin session. Non-admin authenticated users
 * are bounced back to the storefront so they don't land on a 403 from the API
 * a moment later. Server-side auth remains the source of truth.
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { status, isAdmin } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <LoadingState label="Checking admin access" />
  }

  if (status !== 'authenticated') {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  if (!isAdmin) {
    return <Navigate replace to="/" />
  }

  return <>{children}</>
}
