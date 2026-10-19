import { cn } from '@/shared/utils/dom/cn'

/**
 * A pulsing block standing in for something still loading, sized by its
 * `className`. Hidden from screen readers, which hear the page's own loading
 * state instead.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-card bg-[var(--hover-wash)]', className)}
    />
  )
}

/** A page's list while it loads: `count` blocks of `itemClassName`, laid out by `className`. */
export function SkeletonList({
  count,
  className,
  itemClassName,
}: {
  count: number
  className: string
  itemClassName: string
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className={itemClassName} />
      ))}
    </div>
  )
}
