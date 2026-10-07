import type { TablerIcon } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type EmptyStateProps = {
  icon: TablerIcon
  title: ReactNode
  description: ReactNode
  /** Usually the button that fills the emptiness. */
  action?: ReactNode
  /**
   * Grows into whatever height is left in its flex column and centres itself
   * there, instead of sitting as a short box under the page heading. The
   * parent has to be a flex column with a height for this to do anything.
   */
  fill?: boolean
}

/** Shown when a list has nothing in it yet. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  fill = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-[14px] border-[1.5px] border-dashed border-[var(--line-strong)]',
        'bg-[var(--field)] px-6 py-12 text-center',
        fill && 'flex-1 justify-center',
      )}
    >
      <span className="grid size-11 place-items-center rounded-xl bg-[var(--hover-wash)] text-[var(--muted)]">
        <Icon aria-hidden className="size-[18px]" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-medium tracking-[-0.012em]">{title}</p>
        <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-[var(--muted)]">
          {description}
        </p>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
