import type { ReactNode } from 'react'

type AdminRouteProps = {
  children: ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  return <>{children}</>
}
