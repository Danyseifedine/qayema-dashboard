import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMemo, type ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'
import { DragHandle } from './drag-handle'

export type SortableCardProps = {
  id: number
  disabled?: boolean
  /** True when the handle lands on a photo and needs its own background. */
  overlayHandle?: boolean
  /** Receives the handle to place wherever the card wants it. */
  children: (parts: { handle: ReactNode; dragging: boolean }) => ReactNode
  className?: string
}

/**
 * Wraps one card in sortable behaviour and hands back a ready-made handle.
 *
 * dnd-kit's keyboard sensor drives the same handle, so reordering works
 * without a pointer.
 */
export function SortableCard({
  id,
  disabled = false,
  overlayHandle = false,
  children,
  className,
}: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })

  // The handle is a prop on a memoised card, so it has to keep its identity
  // between renders or every card re-renders on every drag frame.
  const handle = useMemo(
    () => (
      <DragHandle
        ref={setActivatorNodeRef}
        disabled={disabled}
        overlay={overlayHandle}
        {...attributes}
        {...listeners}
      />
    ),
    [setActivatorNodeRef, disabled, overlayHandle, attributes, listeners],
  )

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'z-10 opacity-90 shadow-lift', className)}
    >
      {children({ handle, dragging: isDragging })}
    </div>
  )
}
