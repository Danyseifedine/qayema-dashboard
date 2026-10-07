import { IconLock } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { Segmented } from '@/shared/components/ui'
import {
  BASIC_RANGES,
  STATS_RANGES,
  type StatsRange,
} from '@/features/analytics/schemas/analytics.schema'

export type RangePickerProps = {
  value: StatsRange
  onChange: (range: StatsRange) => void
  /** Whether the package includes the longer ranges. */
  advanced: boolean
}

/** 7 and 30 days for every package; 90 days and all time with advanced analytics. */
export function RangePicker({ value, onChange, advanced }: RangePickerProps) {
  const { t } = useTranslation('analytics')

  return (
    <Segmented
      aria-label={t('range.label')}
      size="sm"
      value={value}
      onChange={onChange}
      options={STATS_RANGES.map((range) => {
        const locked = !advanced && !BASIC_RANGES.includes(range)
        return {
          value: range,
          label: t(`range.options.${range}`),
          disabled: locked,
          icon: locked ? <IconLock aria-hidden className="size-3" /> : undefined,
          title: locked ? t('range.locked') : undefined,
        }
      })}
    />
  )
}
