import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TableCard } from '@/features/tables/components/list/table-card'

/** jsdom has no canvas: the fake records what the code was asked to draw. */
const drawn = vi.hoisted(() => ({ created: [] as Record<string, unknown>[] }))

vi.mock('qr-code-styling', () => ({
  default: class {
    constructor(options: Record<string, unknown>) {
      drawn.created.push(options)
    }
    append() {}
  },
}))

const TABLE = {
  id: 3,
  name: 'Terrace',
  code: 'code3',
  url: 'http://localhost:8000/olive?table=code3&qr=1',
}

function renderCard(options = {}) {
  const handlers = {
    onDownload: vi.fn(),
    onPrint: vi.fn(),
    onRename: vi.fn(),
    onNewCode: vi.fn(),
    onRemove: vi.fn(),
  }
  render(<TableCard table={TABLE} options={options} {...handlers} />)
  return handlers
}

describe('TableCard', () => {
  it('draws the table code with its own link, on white when the design has no background', () => {
    renderCard()

    const code = screen.getByRole('img', { name: 'QR code for Terrace' })
    expect(code.parentElement).toHaveStyle({ background: '#FFFFFF' })
    expect(drawn.created.at(-1)).toEqual(
      expect.objectContaining({ data: TABLE.url, width: 112, height: 112 }),
    )
  })

  it('hands the table to whichever action is picked', async () => {
    const user = userEvent.setup()
    const handlers = renderCard({ backgroundOptions: { color: '#FAF7F2' } })

    expect(screen.getByRole('img', { name: 'QR code for Terrace' }).parentElement).toHaveStyle({
      background: '#FAF7F2',
    })

    await user.click(screen.getByRole('button', { name: 'Download QR code' }))
    await user.click(screen.getByRole('button', { name: 'Print card' }))
    await user.click(screen.getByRole('button', { name: 'Rename' }))
    await user.click(screen.getByRole('button', { name: 'New code' }))
    await user.click(screen.getByRole('button', { name: 'Remove' }))

    expect(handlers.onDownload).toHaveBeenCalledWith(TABLE)
    expect(handlers.onPrint).toHaveBeenCalledWith(TABLE)
    expect(handlers.onRename).toHaveBeenCalledWith(TABLE)
    expect(handlers.onNewCode).toHaveBeenCalledWith(TABLE)
    expect(handlers.onRemove).toHaveBeenCalledWith(TABLE)
  })
})
