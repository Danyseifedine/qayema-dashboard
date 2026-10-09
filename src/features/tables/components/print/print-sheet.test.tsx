import { render, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrintSheet } from '@/features/tables/components/print/print-sheet'

/** jsdom has no canvas: the fake records what each code was asked to draw. */
const drawn = vi.hoisted(() => ({ created: [] as Record<string, unknown>[] }))

vi.mock('qr-code-styling', () => ({
  default: class {
    constructor(options: Record<string, unknown>) {
      drawn.created.push(options)
    }
    append() {}
  },
}))

function table(id: number, name: string) {
  return { id, name, code: `code${id}`, url: `http://localhost:8000/olive?table=code${id}&qr=1` }
}

const TABLES = [table(1, 'Table 1'), table(2, 'Terrace')]

/** The sheet goes straight into the page body, outside the app's tree. */
function sheet(): HTMLElement {
  const element = document.body.querySelector<HTMLElement>('.qy-print-sheet')
  if (!element) throw new Error('No print sheet in the page')
  return element
}

describe('PrintSheet', () => {
  beforeEach(() => {
    drawn.created.length = 0
  })

  it('prints one card per table, with its heading, name and code', () => {
    const { container } = render(
      <PrintSheet
        tables={TABLES}
        options={{ backgroundOptions: { color: '#FAF7F2' } }}
        title="Olive"
        ordering
      />,
    )

    // Off screen and outside the app: only paper shows it.
    expect(container).toBeEmptyDOMElement()
    expect(sheet()).toHaveAttribute('aria-hidden', 'true')

    const cards = sheet().querySelectorAll('section')
    expect(cards).toHaveLength(2)
    expect(within(cards[0]!).getByText('Olive')).toBeInTheDocument()
    expect(within(cards[1]!).getByText('Terrace')).toBeInTheDocument()
    expect(within(cards[1]!).getByText('Scan to see the menu and order')).toBeInTheDocument()
    expect(within(cards[1]!).getByLabelText('Terrace').parentElement).toHaveStyle({
      background: '#FAF7F2',
    })

    expect(drawn.created).toEqual([
      expect.objectContaining({
        data: 'http://localhost:8000/olive?table=code1&qr=1',
        width: 200,
        height: 200,
      }),
      expect.objectContaining({ data: 'http://localhost:8000/olive?table=code2&qr=1' }),
    ])
  })

  it('invites to the menu only, with no heading, when the table cannot order', () => {
    render(<PrintSheet tables={TABLES.slice(0, 1)} options={{}} title={null} ordering={false} />)

    const card = sheet().querySelector('section')!
    expect(within(card).getByText('Scan to see the menu')).toBeInTheDocument()
    expect(within(card).queryByText('Scan to see the menu and order')).not.toBeInTheDocument()
    // The table's name and the invitation, nothing above them.
    expect(card.querySelectorAll('p')).toHaveLength(2)
    // A design without a background colour prints on white.
    expect(within(card).getByLabelText('Table 1').parentElement).toHaveStyle({
      background: '#FFFFFF',
    })
  })
})
