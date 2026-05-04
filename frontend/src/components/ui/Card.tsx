import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export function Card({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        'rounded-lg border border-stone-200 bg-white shadow-sm shadow-stone-300/30',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  )
}
