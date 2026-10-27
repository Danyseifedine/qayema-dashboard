import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'

/** What a chip says about its thing, by colour. */
export type ChipTone = 'gold' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'faded'

const TONES: Record<ChipTone, string> = {
  // The one that needs the owner now (a new order).
  gold: 'border-transparent bg-gold text-ink',
  success: 'border-status-success-border bg-status-success-wash text-status-success',
  warning: 'border-status-warn-border bg-status-warn-wash text-status-warn',
  danger: 'border-status-danger-border bg-status-danger-wash text-status-danger',
  info: 'border-status-info-border bg-status-info-wash text-status-info',
  neutral: 'border-[var(--line)] bg-[var(--hover-wash)] text-[var(--muted)]',
  // Past and done with: an outline only.
  faded: 'border-[var(--line)] text-[var(--muted)]',
}

/**
 * A small rounded label for a thing's state: an order's status, an offer's,
 * a new line in an order. One size and shape everywhere, so a status reads
 * the same on every page.
 */
export function StatusChip({
  tone,
  title,
  className,
  children,
}: {
  tone: ChipTone
  /** A longer word on hover, e.g. which language a name fell back to. */
  title?: string
  className?: string
  children: ReactNode
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border-[0.5px] px-2.5 py-0.5 text-[11.5px] leading-[1.4] font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
