import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'accent'
type BadgeTone = 'soft' | 'solid'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
  /**
   * `soft` (default) uses tinted backgrounds. `solid` uses bolder fills, useful
   * for sale ribbons or hero callouts on dark backgrounds.
   */
  tone?: BadgeTone
}

const softClasses: Record<BadgeVariant, string> = {
  neutral: 'border-stone-200 bg-stone-100 text-slate-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-800',
  accent: 'border-sky-200 bg-sky-50 text-sky-800',
}

const solidClasses: Record<BadgeVariant, string> = {
  neutral: 'border-slate-700 bg-slate-700 text-white',
  success: 'border-emerald-700 bg-emerald-700 text-white',
  warning: 'border-amber-500 bg-amber-500 text-amber-950',
  danger: 'border-red-600 bg-red-600 text-white',
  accent: 'border-sky-700 bg-sky-700 text-white',
}

export function Badge({
  children,
  className,
  tone = 'soft',
  variant = 'neutral',
  ...props
}: BadgeProps) {
  const palette = tone === 'solid' ? solidClasses : softClasses
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide',
        palette[variant],
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
    </span>
  )
}
