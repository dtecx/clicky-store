import type { ReactNode } from 'react'

type PageShellProps = {
  actions?: ReactNode
  children: ReactNode
  description?: string
  eyebrow?: string
  title: string
}

export function PageShell({
  actions,
  children,
  description,
  eyebrow,
  title,
}: PageShellProps) {
  return (
    <div className="mx-auto min-h-[calc(100vh-9rem)] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          {eyebrow ? (
            <p className="mb-2 text-sm font-bold uppercase text-emerald-800">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  )
}
