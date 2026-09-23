import { GripVertical } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/utils/dom/cn'

export type DragHandleProps = ComponentProps<'button'> & {
  /**
   * Sits on a photo rather than on a surface, so it brings its own background:
   * a faint grip over an arbitrary image is invisible. The chip follows the
   * theme — pale in light mode, near-black in dark — because a bright chip on
   * a dark screen is louder than anything else on the card.
   */
  overlay?: boolean
}

/**
 * The grip a card is dragged by.
 *
 * Reordering is deliberately not the whole card: on a phone, dragging the card
 * body would fight with scrolling, and a tap on the card should open it for
 * editing. The handle is sized past the 44px touch target.
 */
export function DragHandle({ overlay = false, className, ...props }: DragHandleProps) {
  return (
    <button
      type="button"
      aria-label="Reorder"
      className={cn(
        'grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-[var(--radius-control)]',
        'transition-colors active:cursor-grabbing',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
        overlay
          ? 'bg-overlay-chip text-overlay-chip-ink shadow-lift backdrop-blur-[2px] hover:bg-overlay-chip-hover'
          : 'text-[var(--faint)] hover:bg-[var(--hover-wash)] hover:text-[var(--muted)]',
        className,
      )}
      {...props}
    >
      <GripVertical aria-hidden className="size-4" />
    </button>
  )
}
