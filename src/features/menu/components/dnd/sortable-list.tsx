import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToParentElement } from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import type { ReactNode } from 'react'

export type SortableListProps<T extends { id: number }> = {
  items: T[]
  /** Called with the new order once a drag settles. */
  onReorder: (ordered: T[]) => void
  /** Grid for dish cards, list for category rows. */
  layout?: 'grid' | 'list'
  children: ReactNode
}

/**
 * Drag-and-drop context around a set of cards.
 *
 * The pointer sensor needs 8px of movement before a drag starts, so a tap on a
 * phone still reads as a tap. Reordering is reported once, on drop, rather
 * than on every frame.
 */
export function SortableList<T extends { id: number }>({
  items,
  onReorder,
  layout = 'list',
  children,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const from = items.findIndex((item) => item.id === active.id)
    const to = items.findIndex((item) => item.id === over.id)
    if (from === -1 || to === -1) return

    onReorder(arrayMove(items, from, to))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  )
}
