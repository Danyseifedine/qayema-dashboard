import type { TablerIcon } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type EmptyStateProps = {
  icon: TablerIcon
  title: ReactNode
  description: ReactNode
  /** Usually the button that clears what hides everything. */
  action?: ReactNode
}

/**
 * Shown when a filtered list matches nothing (an empty list gets a
 * PictureEmptyState). It grows into the height left in its flex column and
 * centres itself there.
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-card border-[1.5px] border-dashed border-[var(--line-strong)]',
        'flex-1 justify-center bg-[var(--field)] px-6 py-12 text-center',
      )}
    >
      <span className="grid size-11 place-items-center rounded-card bg-[var(--hover-wash)] text-[var(--muted)]">
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
