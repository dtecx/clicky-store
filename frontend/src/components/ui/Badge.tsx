import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'accent'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'border-slate-200 bg-slate-100 text-slate-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-800',
  accent: 'border-sky-200 bg-sky-50 text-sky-800',
}

export function Badge({
  children,
  className,
  variant = 'neutral',
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
    </span>
  )
}
