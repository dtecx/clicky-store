import { cn } from '../../utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:outline-emerald-700',
  secondary:
    'border-slate-300 bg-white text-slate-950 hover:bg-slate-50 focus-visible:outline-slate-700',
  ghost:
    'border-transparent bg-transparent text-slate-700 hover:bg-white/70 focus-visible:outline-slate-700',
  danger:
    'border-red-600 bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
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
    'inline-flex max-w-full items-center justify-center gap-2 rounded-lg border font-semibold shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
    sizeClasses[size],
    variantClasses[variant],
    className,
  )
}
