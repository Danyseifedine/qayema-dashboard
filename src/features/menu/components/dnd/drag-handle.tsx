import { GripVertical } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/utils/dom/cn'

/**
 * The grip a card is dragged by.
 *
 * Reordering is deliberately not the whole card: on a phone, dragging the card
 * body would fight with scrolling, and a tap on the card should open it for
 * editing. The handle is sized past the 44px touch target.
 */
export function DragHandle({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      aria-label="Reorder"
      className={cn(
        'grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-[var(--radius-control)]',
        'text-[var(--faint)] transition-colors hover:bg-[var(--hover-wash)] hover:text-[var(--muted)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
        'active:cursor-grabbing',
        className,
      )}
      {...props}
    >
      <GripVertical aria-hidden className="size-4" />
    </button>
  )
}
