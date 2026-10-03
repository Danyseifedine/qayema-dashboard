/**
 * Placeholder for a page whose code is still on its way: a heading and a
 * few blocks, so the layout holds still until the page itself (and then its
 * own skeleton) takes over.
 */
export function PageSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4" data-testid="page-skeleton">
      <div className="h-7 w-48 animate-pulse rounded bg-[var(--hover-wash)]" />
      <div className="h-4 w-80 max-w-full animate-pulse rounded bg-[var(--hover-wash)]" />
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-[14px] border-[0.5px] border-[var(--line)] bg-[var(--surface)]"
          />
        ))}
      </div>
    </div>
  )
}
