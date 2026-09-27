import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('overview')
  const views = series.reduce((sum, point) => sum + point.views, 0)
  const scans = series.reduce((sum, point) => sum + point.qr_scans, 0)

  return (
    <figure
      role="img"
      aria-label={t('analytics.visits.chartLabel', {
        count: series.length,
        views: views.toLocaleString(),
        scans: scans.toLocaleString(),
      })}
      className="m-0"
    >
      <div className="flex gap-4 pb-2 text-[12px] text-[var(--muted)]">
        <Legend color={CHART_COLORS.primary} label={t('analytics.visits.views')} />
        <Legend color={CHART_COLORS.secondary} label={t('analytics.visits.qrScans')} />
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
            name={t('analytics.visits.views')}
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            fill="url(#views-fill)"
          />
          <Area
            type="monotone"
            dataKey="qr_scans"
            name={t('analytics.visits.qrScans')}
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
