import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Collapse } from '@/shared/components/ui/collapse'

afterEach(() => vi.useRealTimers())

describe('Collapse', () => {
  it('slides open at once in reach, and leaves the page once shut', () => {
    vi.useFakeTimers()
    const { rerender, container } = render(
      <Collapse open={false}>
        <button type="button">Add your logo</button>
      </Collapse>,
    )
    // Closed from the start: nothing on the page.
    expect(container).toBeEmptyDOMElement()

    rerender(
      <Collapse open>
        <button type="button">Add your logo</button>
      </Collapse>,
    )
    // In reach as soon as it opens, while it eases open.
    expect(screen.getByRole('button', { name: 'Add your logo' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(20))
    expect(container.firstElementChild).toHaveClass('grid-rows-[1fr]')

    rerender(
      <Collapse open={false}>
        <button type="button">Add your logo</button>
      </Collapse>,
    )
    // Shutting: out of reach at once, off the page once it has shut.
    expect(container.firstElementChild).toHaveAttribute('inert')
    expect(screen.queryByRole('button', { name: 'Add your logo' })).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(300))
    expect(container).toBeEmptyDOMElement()
  })
})
