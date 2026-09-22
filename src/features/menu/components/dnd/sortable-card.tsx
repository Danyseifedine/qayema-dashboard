import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/dom/cn'
import { DragHandle } from './drag-handle'

export type SortableCardProps = {
  id: number
  disabled?: boolean
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
export function SortableCard({ id, disabled = false, children, className }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })

  const handle = (
    <DragHandle ref={setActivatorNodeRef} disabled={disabled} {...attributes} {...listeners} />
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
