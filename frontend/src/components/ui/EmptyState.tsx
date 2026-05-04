import type { ReactNode } from 'react'
import { PackageOpen } from 'lucide-react'

type EmptyStateProps = {
  action?: ReactNode
  children?: ReactNode
  icon?: ReactNode
  title: string
}

export function EmptyState({ action, children, icon, title }: EmptyStateProps) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-slate-700">
        {icon ?? <PackageOpen aria-hidden="true" size={22} />}
      </div>
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      {children ? (
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{children}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
