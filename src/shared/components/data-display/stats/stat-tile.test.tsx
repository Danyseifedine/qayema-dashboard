import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatTile, type StatTileProps } from '@/shared/components/data-display/stats/stat-tile'

function renderTile(props: Partial<StatTileProps> = {}) {
  return render(
    <dl>
      <StatTile label="Scans" value="1,204" {...props} />
    </dl>,
  )
}

describe('StatTile', () => {
  it('shows the label and the number, with no change line when left out', () => {
    const { container } = renderTile()

    expect(screen.getByRole('term')).toHaveTextContent('Scans')
    expect(screen.getAllByRole('definition')).toHaveLength(1)
    expect(screen.getByRole('definition')).toHaveTextContent('1,204')
    expect(container.textContent).not.toMatch(/before|compare/)
  })

  it('shows a hint under the number', () => {
    renderTile({ hint: '4 today', className: 'col-span-2' })

    expect(screen.getByText('4 today')).toBeInTheDocument()
    expect(screen.getByRole('term').parentElement).toHaveClass('col-span-2')
  })

  it('says there is nothing to compare with when the change is null', () => {
    renderTile({ change: null })

    expect(screen.getByText('Nothing to compare yet')).toBeInTheDocument()
  })

  it('shows a rise in green with an up arrow', () => {
    renderTile({ change: 0.124 })

    const change = screen.getByText(/↑ 12%/)
    expect(change).toHaveAttribute('dir', 'ltr')
    expect(change).toHaveClass('text-[var(--status-success)]')
    expect(change).toHaveTextContent('↑ 12% vs before')
  })

  it('shows a fall in red with a down arrow and no minus sign', () => {
    renderTile({ change: -0.5 })

    const change = screen.getByText(/↓ 50%/)
    expect(change).toHaveClass('text-[var(--status-danger)]')
    expect(change).not.toHaveTextContent('-')
  })

  it('calls a change that rounds to 0% the same', () => {
    renderTile({ change: 0.004 })

    expect(screen.getByText('Same as before')).toBeInTheDocument()
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })
})
