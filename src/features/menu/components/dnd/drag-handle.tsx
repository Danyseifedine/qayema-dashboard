import { IconGripVertical } from '@tabler/icons-react'
import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/utils/dom/cn'

export type DragHandleProps = ComponentProps<'button'>

/**
 * The grip a card is dragged by.
 *
 * Reordering is deliberately not the whole card: on a phone, dragging the card
 * body would fight with scrolling, and a tap on the card should open it for
 * editing. The handle is sized past the 44px touch target.
 */
export function DragHandle({ className, ...props }: DragHandleProps) {
  const { t } = useTranslation('menu')
  return (
    <button
      type="button"
      aria-label={t('dragHandle.label')}
      className={cn(
        'grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-[var(--radius-control)]',
        'transition-colors active:cursor-grabbing',
        'focus-ring',
        'text-[var(--faint)] hover:bg-[var(--hover-wash)] hover:text-[var(--muted)]',
        className,
      )}
      {...props}
    >
      <IconGripVertical aria-hidden className="size-4" />
    </button>
  )
}
