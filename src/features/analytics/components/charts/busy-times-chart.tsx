import { Trans, useTranslation } from 'react-i18next'
import { Bar, BarChart, Cell, Tooltip, XAxis } from 'recharts'
import type { Locale } from '@/shared/constants/locales'
import {
  AXIS_TICK,
  CHART_COLORS,
  TOOLTIP_STYLE,
} from '@/features/analytics/components/charts/chart-style'
import { formatHour, weekdayNames } from '@/shared/utils/format/date'
import { formatNumber } from '@/shared/utils/format/number'

export type BusyTimesChartProps = {
  /** Views by hour, 0–23, in the restaurant's timezone. */
  hours: number[]
  /** Views by weekday, Monday first. */
  weekdays: number[]
  locale: Locale
}

/**
 * When guests open the menu: by hour of the day and by day of the week, with
 * the busiest of each picked out and said in words.
 */
export function BusyTimesChart({ hours, weekdays, locale }: BusyTimesChartProps) {
  const { t } = useTranslation('analytics')
  const days = weekdayNames(locale)
  const longDays = weekdayNames(locale, 'long')
  const peakHour = indexOfMax(hours)
  const peakDay = indexOfMax(weekdays)

  if (peakHour === null || peakDay === null) {
    return <p className="py-6 text-[13px] text-[var(--muted)]">{t('busiest.notEnough')}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px]">
        <Trans
          ns="analytics"
          i18nKey="busiest.sentence"
          values={{ hour: formatHour(peakHour), day: longDays[peakDay] }}
          components={{ strong: <strong className="font-semibold" /> }}
        />
      </p>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[3fr_2fr]">
        <Bars
          label={t('busiest.byHour')}
          data={hours.map((views, hour) => ({ name: formatHour(hour), views }))}
          peak={peakHour}
          tickInterval={5}
          locale={locale}
        />
        <Bars
          label={t('busiest.byDay')}
          data={weekdays.map((views, day) => ({ name: days[day]!, views }))}
          peak={peakDay}
          tickInterval={0}
          locale={locale}
        />
      </div>
    </div>
  )
}

function Bars({
  label,
  data,
  peak,
  tickInterval,
  locale,
}: {
  label: string
  data: { name: string; views: number }[]
  peak: number
  tickInterval: number
  locale: Locale
}) {
  const { t } = useTranslation('analytics')

  return (
    <figure className="m-0" aria-label={label}>
      <figcaption className="pb-1 text-[12px] text-[var(--muted)]">{label}</figcaption>
      <div dir="ltr">
        <BarChart
          responsive
          data={data}
          style={{ width: '100%', height: 150 }}
          margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
        >
          <XAxis
            dataKey="name"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            interval={tickInterval}
          />
          <Tooltip
            cursor={{ fill: 'var(--hover-wash)' }}
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => [formatNumber(Number(value), locale), t('busiest.views')]}
          />
          <Bar dataKey="views" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={index === peak ? CHART_COLORS.primary : CHART_COLORS.primarySoft}
              />
            ))}
          </Bar>
        </BarChart>
      </div>
    </figure>
  )
}

/** The index of the largest count, or null when every count is zero. */
function indexOfMax(values: number[]): number | null {
  let best: number | null = null
  values.forEach((value, index) => {
    if (value > 0 && (best === null || value > values[best]!)) best = index
  })
  return best
}
