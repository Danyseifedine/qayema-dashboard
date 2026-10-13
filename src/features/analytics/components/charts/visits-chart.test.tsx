import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { VisitsChart } from '@/features/analytics/components/charts/visits-chart'

// jsdom gives the chart no size, so recharts never draws its tooltip or axis.
// These stand-ins call the formatters directly, on the points a test picks.
const formatted = vi.hoisted(() => ({ tick: '2026-09-25', label: '2026-09-26' }))

vi.mock('recharts', () => ({
  AreaChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Area: () => null,
  CartesianGrid: () => null,
  YAxis: () => null,
  XAxis: ({ tickFormatter }: { tickFormatter: (date: string) => string }) => (
    <span data-testid="tick">{tickFormatter(formatted.tick)}</span>
  ),
  Tooltip: ({ labelFormatter }: { labelFormatter: (date: unknown) => string }) => (
    <output>{labelFormatter(formatted.label)}</output>
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

  it('charts today by the hour', () => {
    formatted.tick = '2026-10-13T09:00'
    formatted.label = '2026-10-13T14:00'
    render(
      <VisitsChart
        series={[
          { date: '2026-10-13T09:00', views: 3, qr_scans: 1 },
          { date: '2026-10-13T14:00', views: 5, qr_scans: 2 },
        ]}
        locale="en"
      />,
    )

    expect(
      screen.getByRole('img', { name: '8 views today, 3 of them QR scans.' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('tick')).toHaveTextContent('09:00')
    expect(screen.getByRole('status')).toHaveTextContent('14:00')
  })
})
