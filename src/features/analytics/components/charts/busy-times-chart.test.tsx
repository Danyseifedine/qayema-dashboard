import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { BusyTimesChart } from '@/features/analytics/components/charts/busy-times-chart'

// jsdom gives the chart no size, so recharts never draws its tooltip. These
// stand-ins render the children and call the tooltip's formatter directly.
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Bar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Cell: ({ fill }: { fill: string }) => <span data-testid="cell" data-fill={fill} />,
  XAxis: () => null,
  Tooltip: ({ formatter }: { formatter: (value: unknown) => [string, string] }) => (
    <output>{formatter('1234').join(' ')}</output>
  ),
}))

function hoursWithPeak(peak: number): number[] {
  const hours = Array.from({ length: 24 }, () => 0)
  hours[peak] = 5
  return hours
}

describe('BusyTimesChart', () => {
  it('names the busiest hour and day, and formats the tooltip', () => {
    render(<BusyTimesChart hours={hoursWithPeak(9)} weekdays={[0, 0, 7, 0, 0, 0, 0]} locale="en" />)

    expect(screen.getByText(/Busiest around/)).toHaveTextContent(
      'Busiest around 09:00, and on Wednesday.',
    )
    expect(screen.getAllByText('1,234 Views')).toHaveLength(2)
  })

  it('keeps the first peak when two are level', () => {
    const hours = hoursWithPeak(3)
    hours[15] = 5
    render(<BusyTimesChart hours={hours} weekdays={[2, 2, 1, 0, 0, 0, 0]} locale="en" />)

    expect(screen.getByText(/Busiest around/)).toHaveTextContent(
      'Busiest around 03:00, and on Monday.',
    )
  })

  it('says there is not enough to go on when nothing was counted', () => {
    render(
      <BusyTimesChart
        hours={Array.from({ length: 24 }, () => 0)}
        weekdays={[0, 0, 0, 0, 0, 0, 0]}
        locale="en"
      />,
    )

    expect(screen.getByText('Not enough visits yet.')).toBeInTheDocument()
    expect(screen.queryByText(/Busiest around/)).not.toBeInTheDocument()
  })
})
