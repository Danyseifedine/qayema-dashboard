import { Skeleton } from '@/shared/components/feedback/skeletons/skeleton'

/** Placeholder card, matched to the dish card's proportions. */
function CardSkeleton() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-card border-[0.5px] border-[var(--line)] bg-[var(--surface)]"
    >
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="flex flex-col gap-2 p-3.5">
        <Skeleton className="h-4 w-2/3 rounded" />
        <Skeleton className="h-3 w-1/3 rounded" />
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
