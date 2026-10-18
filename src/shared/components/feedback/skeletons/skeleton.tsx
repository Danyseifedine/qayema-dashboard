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
