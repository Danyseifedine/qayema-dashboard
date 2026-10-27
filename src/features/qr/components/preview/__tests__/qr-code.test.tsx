import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QrCode } from '@/features/qr/components/preview/qr-code'

/** jsdom has no canvas, so the drawing library is replaced by a recorder. */
const drawn = vi.hoisted(() => ({
  created: [] as Record<string, unknown>[],
  appended: 0,
}))

vi.mock('qr-code-styling', () => ({
  default: class {
    constructor(options: Record<string, unknown>) {
      drawn.created.push(options)
    }
    append(host: HTMLElement) {
      drawn.appended += 1
      host.appendChild(document.createElement('svg'))
    }
  },
}))

describe('QrCode', () => {
  beforeEach(() => {
    drawn.created.length = 0
    drawn.appended = 0
  })

  it('draws the code as an SVG at its size, named for a screen reader', () => {
    render(<QrCode options={{ data: 'a' }} size={200} label="Terrace" className="w-[200px]" />)

    expect(drawn.created).toEqual([{ data: 'a', width: 200, height: 200, type: 'svg' }])
    expect(drawn.appended).toBe(1)
    expect(screen.getByRole('img', { name: 'Terrace' })).toHaveClass('aspect-square', 'w-[200px]')
  })

  it('draws afresh on a change, so a gradient or logo taken away is gone', () => {
    // The library's own update() merges, which kept both on the code.
    const gradient = {
      type: 'linear' as const,
      colorStops: [
        { offset: 0, color: '#000000' },
        { offset: 1, color: '#7C3AED' },
      ],
    }
    const { rerender } = render(
      <QrCode
        options={{ data: 'a', image: 'data:logo', dotsOptions: { gradient } }}
        size={232}
        label="Code"
      />,
    )

    rerender(
      <QrCode options={{ data: 'a', dotsOptions: { color: '#000000' } }} size={232} label="Code" />,
    )

    expect(drawn.created).toHaveLength(2)
    expect(drawn.created[1]).toEqual({
      data: 'a',
      dotsOptions: { color: '#000000' },
      width: 232,
      height: 232,
      type: 'svg',
    })
    // One drawing on screen, not the old one under the new.
    expect(screen.getByRole('img').childElementCount).toBe(1)
  })

  it('clears its drawing when it goes away', () => {
    const { unmount } = render(<QrCode options={{ data: 'a' }} size={232} label="Code" />)
    const host = screen.getByRole('img')
    expect(host.childElementCount).toBe(1)

    unmount()
    expect(host.childElementCount).toBe(0)
  })
})
