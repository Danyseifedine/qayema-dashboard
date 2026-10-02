import type { UserEvent } from '@testing-library/user-event'
import { vi } from 'vitest'

/** Every drag handle dnd-kit renders. */
const HANDLE = '[aria-roledescription="sortable"]'

/**
 * jsdom lays nothing out, so every rect is zero and dnd-kit's keyboard sensor
 * finds nothing "below" the picked-up card. Each sortable wrapper (an element
 * holding a handle, beside at least one more that does) gets a row of its
 * own, so a list inside a card (a variant's options) gets rows too;
 * everything else is one big box, so the parent-bound modifier never clamps
 * the move.
 */
export function stubSortableRects() {
  return vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: Element,
  ) {
    const rows = Array.from(this.parentElement?.children ?? []).filter(
      (sibling) => sibling.querySelector(HANDLE) !== null,
    )
    if (rows.length > 1 && rows.includes(this)) {
      return DOMRect.fromRect({ x: 0, y: rows.indexOf(this) * 100, width: 300, height: 80 })
    }
    return DOMRect.fromRect({ x: 0, y: 0, width: 1000, height: 5000 })
  })
}

/** Picks a card up by its grip, moves it one place down, and drops it. */
export async function moveDown(user: UserEvent, handle: HTMLElement) {
  handle.focus()
  await user.keyboard(' ')
  await user.keyboard('{ArrowDown}')
  await user.keyboard(' ')
}
