import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import type { Locale } from '@/shared/constants/locales'
import type { StatsSummary } from '../../schemas/stats.schema'
import { AXIS_TICK, CHART_COLORS, TOOLTIP_STYLE, formatDay } from './chart-style'

export type VisitsChartProps = {
  series: StatsSummary['series']
  locale: Locale
}

/** Menu views per day, with the QR scans among them. */
export function VisitsChart({ series, locale }: VisitsChartProps) {
  const views = series.reduce((sum, point) => sum + point.views, 0)
  const scans = series.reduce((sum, point) => sum + point.qr_scans, 0)

  return (
    <figure
      role="img"
      aria-label={`${views.toLocaleString()} views over ${series.length} days, ${scans.toLocaleString()} of them QR scans.`}
      className="m-0"
    >
      <div className="flex gap-4 pb-2 text-[12px] text-[var(--muted)]">
        <Legend color={CHART_COLORS.primary} label="Views" />
        <Legend color={CHART_COLORS.secondary} label="QR scans" />
      </div>
      {/* Time runs left to right in both languages. */}
      <div dir="ltr">
        <AreaChart
          responsive
          data={series}
          style={{ width: '100%', height: 220 }}
          margin={{ top: 6, right: 6, bottom: 0, left: -18 }}
        >
          <defs>
            <linearGradient id="views-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.22} />
              <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
          <XAxis
            dataKey="date"
            tickFormatter={(date: string) => formatDay(date, locale)}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(date) => formatDay(String(date), locale)}
          />
          <Area
            type="monotone"
            dataKey="views"
            name="Views"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            fill="url(#views-fill)"
          />
          <Area
            type="monotone"
            dataKey="qr_scans"
            name="QR scans"
            stroke={CHART_COLORS.secondary}
            strokeWidth={2}
            fill="none"
          />
        </AreaChart>
      </div>
    </figure>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="size-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
