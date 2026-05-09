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
    <div
      className="rounded-2xl border border-red-200 bg-red-50/80 px-5 py-4 text-red-900 shadow-sm shadow-red-900/5"
      role="alert"
    >
      <div className="flex gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={20} />
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="mt-1 text-sm leading-6">{message}</p>
          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </div>
  )
}
