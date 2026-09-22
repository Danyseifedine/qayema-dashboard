import { cn } from '@/shared/utils/dom/cn'

/** Placeholder card, matched to the dish card's proportions. */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'overflow-hidden rounded-[14px] border-[0.5px] border-[var(--line)] bg-[var(--surface)]',
        className,
      )}
    >
      <div className="aspect-[4/3] animate-pulse bg-[var(--hover-wash)]" />
      <div className="flex flex-col gap-2 p-3.5">
        <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--hover-wash)]" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-[var(--hover-wash)]" />
      </div>
    </div>
  )
}

/** A grid of placeholder cards while a list loads. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  )
}
