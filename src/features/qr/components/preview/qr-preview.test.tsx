import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QrPreview } from '@/features/qr/components/preview/qr-preview'

/** jsdom has no canvas, so the drawing library is replaced by a recorder. */
const drawn = vi.hoisted(() => ({
  created: [] as Record<string, unknown>[],
  updated: [] as Record<string, unknown>[],
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
    update(options: Record<string, unknown>) {
      drawn.updated.push(options)
    }
  },
}))

describe('QrPreview', () => {
  beforeEach(() => {
    drawn.created.length = 0
    drawn.updated.length = 0
    drawn.appended = 0
  })

  it('draws once, then updates the same drawing', () => {
    const { rerender } = render(
      <QrPreview options={{ data: 'a', backgroundOptions: { color: '#101010' } }} size={100} />,
    )

    expect(drawn.created).toEqual([
      { data: 'a', backgroundOptions: { color: '#101010' }, width: 100, height: 100, type: 'svg' },
    ])
    expect(drawn.appended).toBe(1)
    expect(screen.getByRole('img', { name: "Your menu's QR code" }).parentElement).toHaveStyle({
      background: '#101010',
    })

    rerender(<QrPreview options={{ data: 'b' }} size={100} />)
    expect(drawn.created).toHaveLength(1)
    expect(drawn.updated).toEqual([{ data: 'b', width: 100, height: 100, type: 'svg' }])
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
