import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'

type ContainerProps = HTMLAttributes<HTMLElement> & {
  /** Render as a different element. Defaults to `div`. */
  as?: ElementType
  /** Cap the inner width. Defaults to `7xl` (1280px) which fits the design grid. */
  size?: '5xl' | '6xl' | '7xl'
  children: ReactNode
}

const sizeClasses = {
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
} as const

/**
 * Centered, padded page-width wrapper. Use this on every page so the gutter
 * matches the header/footer (px-4 / sm:px-6 / lg:px-8).
 */
export function Container({
  as,
  children,
  className,
  size = '7xl',
  ...props
}: ContainerProps) {
  const Element = (as ?? 'div') as ElementType
  return (
    <Element
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </Element>
  )
}
