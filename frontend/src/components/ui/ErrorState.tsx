import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

type ErrorStateProps = {
  action?: ReactNode
  message: string
  title?: string
}

export function ErrorState({
  action,
  message,
  title = 'Something went wrong',
}: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-red-900">
      <div className="flex gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={20} />
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm leading-6">{message}</p>
          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </div>
  )
}
