import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type EmptyStateProps = {
  icon?: LucideIcon
  title: ReactNode
  description?: ReactNode
  /** Usually the button that fills the emptiness. */
  action?: ReactNode
  className?: string
}

/** Shown when a list has nothing in it yet. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-[14px] border-[1.5px] border-dashed border-[var(--line-strong)]',
        'bg-[var(--field)] px-6 py-12 text-center',
        className,
      )}
    >
      {Icon ? (
        <span className="grid size-11 place-items-center rounded-xl bg-[var(--hover-wash)] text-[var(--muted)]">
          <Icon aria-hidden className="size-[18px]" />
        </span>
      ) : null}
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-medium tracking-[-0.012em]">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-[var(--muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
