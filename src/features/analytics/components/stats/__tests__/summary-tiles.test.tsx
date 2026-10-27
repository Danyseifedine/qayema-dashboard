import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render-with-providers'
import { SummaryTiles } from '@/features/analytics/components/stats/summary-tiles'

const totals = { views: 4, unique_visitors: 3, qr_scans: 1, views_today: 2, orders_done: null }

describe('SummaryTiles', () => {
  it('lets three tiles share the row, the third taking a phone row of its own', () => {
    renderWithProviders(
      <SummaryTiles totals={{ ...totals, orders: null }} channel={null} locale="en" />,
    )

    const grid = screen.getByText('Menu views').closest('dl')!
    expect(grid.children).toHaveLength(3)
    expect(grid).toHaveClass('lg:grid-cols-3', 'max-lg:*:last:col-span-2')
  })

  it('puts four in a row when orders are counted', () => {
    renderWithProviders(
      <SummaryTiles totals={{ ...totals, orders: 5 }} channel="menu" locale="en" />,
    )

    const grid = screen.getByText('Menu views').closest('dl')!
    expect(grid.children).toHaveLength(4)
    expect(grid).toHaveClass('lg:grid-cols-4')
    expect(grid).not.toHaveClass('max-lg:*:last:col-span-2')
  })
})
