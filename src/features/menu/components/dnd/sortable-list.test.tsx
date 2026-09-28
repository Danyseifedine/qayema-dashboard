import type { DndContextProps, DragEndEvent } from '@dnd-kit/core'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SortableCard, SortableList } from '@/features/menu/components/dnd'

// The real context renders; only its props are kept, so a drop that the
// keyboard sensor cannot produce in jsdom (nothing under the card, a card
// that left the list mid-drag) can be handed straight to the handler.
let context: DndContextProps | undefined
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>()
  return {
    ...actual,
    DndContext: (props: DndContextProps) => {
      context = props
      return <actual.DndContext {...props} />
    },
  }
})

const items = [{ id: 1 }, { id: 2 }, { id: 3 }]

function drop(active: number, over: number | null) {
  context!.onDragEnd!({
    active: { id: active },
    over: over === null ? null : { id: over },
  } as unknown as DragEndEvent)
}

function List({
  onReorder,
  layout,
}: {
  onReorder: (ordered: { id: number }[]) => void
  layout: 'grid' | 'list'
}) {
  return (
    <SortableList items={items} onReorder={onReorder} layout={layout}>
      {items.map((item) => (
        <SortableCard key={item.id} id={item.id}>
          {({ handle }) => (
            <div>
              {handle}
              <span>Item {item.id}</span>
            </div>
          )}
        </SortableCard>
      ))}
    </SortableList>
  )
}

describe('SortableList', () => {
  beforeEach(() => {
    context = undefined
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('reports the new order once a card lands on another', () => {
    const onReorder = vi.fn()
    render(<List onReorder={onReorder} layout="list" />)

    drop(1, 3)

    expect(onReorder).toHaveBeenCalledWith([{ id: 2 }, { id: 3 }, { id: 1 }])
  })

  it('reports nothing for a drop outside every card or back on itself', () => {
    const onReorder = vi.fn()
    render(<List onReorder={onReorder} layout="grid" />)

    drop(2, null)
    drop(2, 2)

    expect(onReorder).not.toHaveBeenCalled()
  })

  it('reports nothing when either card is no longer in the list', () => {
    const onReorder = vi.fn()
    render(<List onReorder={onReorder} layout="list" />)

    drop(99, 1)
    drop(1, 99)

    expect(onReorder).not.toHaveBeenCalled()
  })
})

describe('SortableCard', () => {
  it('hands each card a keyboard-reachable grip', () => {
    render(<List onReorder={vi.fn()} layout="list" />)

    const handles = screen.getAllByRole('button', { name: 'Reorder' })
    expect(handles).toHaveLength(3)
    expect(handles[0]).toHaveAttribute('aria-roledescription', 'sortable')
    expect(handles[0]).toBeEnabled()
  })
})
