import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SortableCard, SortableList } from '@/features/menu/components/dnd'

const items = [{ id: 1 }, { id: 2 }, { id: 3 }]

function List({ onReorder }: { onReorder: (ordered: { id: number }[]) => void }) {
  return (
    <SortableList items={items} onReorder={onReorder} layout="grid">
      <div data-testid="row">
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
      </div>
    </SortableList>
  )
}

// jsdom lays nothing out: the cards are given a row of 100px boxes, side by
// side in their row, so the arrow keys have somewhere to go.
function layOutRow() {
  return vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const row = this.dataset.testid === 'row'
    const parent = this.parentElement
    const index = parent?.dataset.testid === 'row' ? [...parent.children].indexOf(this) : -1
    const left = row ? 0 : Math.max(index, 0) * 100
    const width = row ? 300 : 100
    return {
      x: left,
      y: 0,
      left,
      top: 0,
      width,
      height: 50,
      right: left + width,
      bottom: 50,
      toJSON: () => ({}),
    } as DOMRect
  })
}

function liveText() {
  return screen.getByRole('status').textContent
}

describe('EagerKeyboardSensor', () => {
  beforeEach(() => {
    // dnd-kit's own keydown listener waits on a timer; held back here, so
    // every key below lands before it, as it does while the page redraws.
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    layOutRow()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('reads the keys pressed straight after Space picks a card up', () => {
    const onReorder = vi.fn()
    render(<List onReorder={onReorder} />)
    const grip = screen.getAllByRole('button', { name: 'Reorder' })[0]!

    grip.focus()
    fireEvent.keyDown(grip, { code: 'Space' })
    // The Space that picked it up is not read again as a drop.
    expect(liveText()).toContain('Draggable item 1 was moved over droppable area 1.')

    fireEvent.keyDown(grip, { code: 'ArrowRight' })
    expect(liveText()).toContain('Draggable item 1 was moved over droppable area 2.')

    fireEvent.keyDown(grip, { code: 'Space' })
    expect(onReorder).toHaveBeenCalledWith([{ id: 2 }, { id: 1 }, { id: 3 }], 0, 1)
  })

  it('reads an Escape straight after as a cancel', () => {
    const onReorder = vi.fn()
    render(<List onReorder={onReorder} />)
    const grip = screen.getAllByRole('button', { name: 'Reorder' })[0]!

    grip.focus()
    fireEvent.keyDown(grip, { code: 'Space' })
    fireEvent.keyDown(grip, { code: 'Escape' })

    expect(liveText()).toContain('Dragging was cancelled.')
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('does nothing with keys once the drag is over, and stops listening', () => {
    const onReorder = vi.fn()
    render(<List onReorder={onReorder} />)
    const grip = screen.getAllByRole('button', { name: 'Reorder' })[0]!
    const removed = vi.spyOn(document, 'removeEventListener')

    grip.focus()
    fireEvent.keyDown(grip, { code: 'Space' })
    fireEvent.keyDown(grip, { code: 'ArrowRight' })
    fireEvent.keyDown(grip, { code: 'Space' })
    expect(onReorder).toHaveBeenCalledTimes(1)

    // dnd-kit's timer adds its listener after the drop: it must not drop again.
    vi.runAllTimers()
    fireEvent.keyDown(document.body, { code: 'Space' })

    expect(onReorder).toHaveBeenCalledTimes(1)
    expect(removed).toHaveBeenCalledWith('keydown', expect.any(Function))
  })
})
