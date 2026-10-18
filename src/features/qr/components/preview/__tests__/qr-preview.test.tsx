import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QrPreview } from '@/features/qr/components/preview/qr-preview'

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

describe('QrPreview', () => {
  beforeEach(() => {
    drawn.created.length = 0
    drawn.appended = 0
  })

  it('draws the code in the frame of its background', () => {
    render(<QrPreview options={{ data: 'a', backgroundOptions: { color: '#101010' } }} />)

    expect(drawn.created).toEqual([
      { data: 'a', backgroundOptions: { color: '#101010' }, width: 232, height: 232, type: 'svg' },
    ])
    expect(drawn.appended).toBe(1)
    expect(screen.getByRole('img', { name: "Your menu's QR code" }).parentElement).toHaveStyle({
      background: '#101010',
    })
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
      <QrPreview options={{ data: 'a', image: 'data:logo', dotsOptions: { gradient } }} />,
    )

    rerender(<QrPreview options={{ data: 'a', dotsOptions: { color: '#000000' } }} />)

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

  it('frames the code in white when no background is given', () => {
    render(<QrPreview options={{ data: 'a' }} />)

    expect(screen.getByRole('img').parentElement).toHaveStyle({ background: '#FFFFFF' })
    expect(drawn.created[0]).toMatchObject({ width: 232, height: 232 })
  })

  it('clears its drawing when it goes away', () => {
    const { unmount } = render(<QrPreview options={{ data: 'a' }} />)
    const host = screen.getByRole('img')
    expect(host.childElementCount).toBe(1)

    unmount()
    expect(host.childElementCount).toBe(0)
  })
})
