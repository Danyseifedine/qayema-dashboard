import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { VisitsChart } from '@/features/analytics/components/charts/visits-chart'

// jsdom gives the chart no size, so recharts never draws its tooltip or axis.
// These stand-ins call the formatters directly.
vi.mock('recharts', () => ({
  AreaChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Area: () => null,
  CartesianGrid: () => null,
  YAxis: () => null,
  XAxis: ({ tickFormatter }: { tickFormatter: (date: string) => string }) => (
    <span data-testid="tick">{tickFormatter('2026-09-25')}</span>
  ),
  Tooltip: ({ labelFormatter }: { labelFormatter: (date: unknown) => string }) => (
    <output>{labelFormatter('2026-09-26')}</output>
  ),
}))

describe('VisitsChart', () => {
  const series = [
    { date: '2026-09-25', views: 1500, qr_scans: 40 },
    { date: '2026-09-26', views: 70, qr_scans: 50 },
  ]

  it('describes the whole chart for a screen reader', () => {
    render(<VisitsChart series={series} locale="en" />)

    expect(
      screen.getByRole('img', { name: '1,570 views over 2 days, 90 of them QR scans.' }),
    ).toBeInTheDocument()
  })

  it('writes the days on the axis and in the tooltip', () => {
    render(<VisitsChart series={series} locale="en" />)

    expect(screen.getByTestId('tick')).toHaveTextContent('Sep 25')
    expect(screen.getByRole('status')).toHaveTextContent('Sep 26')
  })
})
