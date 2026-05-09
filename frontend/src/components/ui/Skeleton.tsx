import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

type SkeletonProps = HTMLAttributes<HTMLDivElement>

/**
 * Content-shaped placeholder block used while data is loading. Combine several
 * `<Skeleton />` blocks to mimic the eventual layout (e.g. a card with image,
 * title, price). Animated with Tailwind's built-in pulse.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-lg bg-stone-200/80',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Skeleton block shaped like a `<ProductCard />`. Used by HomePage and other
 * grid views while products are still loading from the API.
 */
export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm shadow-stone-400/10">
      <Skeleton className="mb-5 aspect-square w-full" />
      <Skeleton className="mb-3 h-5 w-3/4" />
      <Skeleton className="mb-5 h-4 w-1/2" />
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  )
}
