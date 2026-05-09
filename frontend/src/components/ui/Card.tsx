import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

type CardProps = HTMLAttributes<HTMLElement> & {
  /**
   * When true the card gets a hover lift, subtle ring change, and pointer
   * cursor. Use it for clickable previews like product cards.
   */
  interactive?: boolean
  /**
   * When true the card uses a tighter shadow and no border for a flatter look.
   */
  flat?: boolean
}

export function Card({
  children,
  className,
  flat = false,
  interactive = false,
  ...props
}: CardProps) {
  return (
    <section
      className={cn(
        'rounded-2xl bg-white transition-shadow',
        flat
          ? 'shadow-[0_1px_0_rgba(15,23,42,0.04)]'
          : 'border border-stone-200/80 shadow-sm shadow-stone-400/10',
        interactive
          && 'cursor-pointer hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md hover:shadow-stone-400/15',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  )
}
