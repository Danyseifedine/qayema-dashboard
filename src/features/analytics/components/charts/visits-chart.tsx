import { useTranslation } from 'react-i18next'
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import type { Locale } from '@/shared/constants/locales'
import type { StatsSummary } from '@/features/analytics/schemas/analytics.schema'
import {
  AXIS_TICK,
  CHART_COLORS,
  TOOLTIP_STYLE,
} from '@/features/analytics/components/charts/chart-style'
import { formatDay, formatHour } from '@/shared/utils/format/date'
import { formatNumber } from '@/shared/utils/format/number'

export type VisitsChartProps = {
  series: StatsSummary['series']
  locale: Locale
}

/** A point's time: its hour for today ("2026-10-13T14:00"), its day otherwise. */
function pointLabel(date: string, locale: Locale): string {
  return date.includes('T') ? formatHour(Number(date.slice(11, 13))) : formatDay(date, locale)
}

/** Menu views per day (per hour for today), with the QR scans among them. */
export function VisitsChart({ series, locale }: VisitsChartProps) {
  const { t } = useTranslation('analytics')
  const views = series.reduce((sum, point) => sum + point.views, 0)
  const scans = series.reduce((sum, point) => sum + point.qr_scans, 0)
  const byHour = series[0]?.date.includes('T') ?? false

  return (
    <figure
      role="img"
      aria-label={
        byHour
          ? t('visits.chartLabelToday', {
              views: formatNumber(views, locale),
              scans: formatNumber(scans, locale),
            })
          : t('visits.chartLabel', {
              count: series.length,
              views: formatNumber(views, locale),
              scans: formatNumber(scans, locale),
            })
      }
      className="m-0"
    >
      <div className="flex gap-4 pb-2 text-[12px] text-[var(--muted)]">
        <Legend color={CHART_COLORS.primary} label={t('visits.views')} />
        <Legend color={CHART_COLORS.secondary} label={t('visits.qrScans')} />
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
            tickFormatter={(date: string) => pointLabel(date, locale)}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(date) => pointLabel(String(date), locale)}
          />
          <Area
            type="monotone"
            dataKey="views"
            name={t('visits.views')}
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            fill="url(#views-fill)"
          />
          <Area
            type="monotone"
            dataKey="qr_scans"
            name={t('visits.qrScans')}
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
