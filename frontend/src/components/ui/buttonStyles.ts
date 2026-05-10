import { cn } from '../../utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border-emerald-600 bg-emerald-600 text-white shadow-sm shadow-emerald-900/15 hover:bg-emerald-700 hover:border-emerald-700 focus-visible:ring-emerald-500/40',
  secondary:
    'border-stone-300 bg-white text-slate-900 shadow-sm shadow-stone-400/10 hover:border-stone-400 hover:bg-stone-50 focus-visible:ring-slate-500/30',
  outline:
    'border-slate-900 bg-transparent text-slate-900 hover:bg-slate-900 hover:text-white focus-visible:ring-slate-500/30',
  ghost:
    'border-transparent bg-transparent text-slate-700 hover:bg-stone-100 hover:text-slate-900 focus-visible:ring-slate-500/30',
  danger:
    'border-red-600 bg-red-600 text-white shadow-sm shadow-red-900/15 hover:bg-red-700 hover:border-red-700 focus-visible:ring-red-500/40',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

export function buttonClasses({
  className,
  size = 'md',
  variant = 'primary',
}: {
  className?: string
  size?: ButtonSize
  variant?: ButtonVariant
}) {
  return cn(
    'inline-flex max-w-full items-center justify-center gap-2 rounded-lg border font-semibold transition-colors duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50',
    'disabled:cursor-not-allowed disabled:opacity-60',
    sizeClasses[size],
    variantClasses[variant],
    className,
  )
}
