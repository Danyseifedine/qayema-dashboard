import { IconCheck } from '@tabler/icons-react'
import { cn } from '@/shared/utils/dom/cn'

/**
 * A step's number in a row or a column of steps: green with a tick once
 * done, gold where the owner is, outlined ahead. `open` paints the step on
 * screen solid gold (the offer editor's).
 */
export function StepCircle({
  number,
  state,
  className,
}: {
  number: number
  state: 'done' | 'open' | 'current' | 'ahead'
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-7 shrink-0 place-items-center rounded-full text-[12.5px] font-semibold tabular-nums transition-colors',
        state === 'done' && 'bg-status-success text-white',
        state === 'open' && 'bg-gold text-ink',
        state === 'current' && 'bg-accent-wash text-accent ring-1 ring-[var(--gold-on)]',
        state === 'ahead' &&
          'border-[1.5px] border-[var(--line-strong)] bg-[var(--surface)] text-[var(--muted)]',
        className,
      )}
    >
      {state === 'done' ? <IconCheck className="size-3.5" stroke={3} /> : number}
    </span>
  )
}
