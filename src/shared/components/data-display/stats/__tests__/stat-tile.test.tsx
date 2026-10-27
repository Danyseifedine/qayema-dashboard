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
    renderTile({ hint: '4 today' })

    expect(screen.getByText('4 today')).toBeInTheDocument()
  })

  it('says there is nothing to compare with when the change is null', () => {
    renderTile({ change: null })

    expect(screen.getByText('Nothing to compare yet')).toBeInTheDocument()
  })

  it('says how the number moved against the period before', () => {
    renderTile({ change: 0.124 })

    expect(screen.getByText('+12%')).toHaveClass('text-status-success')
    expect(screen.getAllByRole('definition')[1]).toHaveTextContent('+12%vs before')
  })

  it('is a panel inside a card, or a glass card of its own', () => {
    const { rerender } = render(<StatTile label="Views" value="40" />)
    expect(screen.getByText('Views').parentElement).toHaveClass('inset-tile')

    rerender(<StatTile label="Views" value="40" standalone />)
    expect(screen.getByText('Views').parentElement).toHaveClass('glass-card')
    expect(screen.getByText('Views').parentElement).not.toHaveClass('inset-tile')
  })
})
