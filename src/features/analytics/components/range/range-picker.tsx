import { IconLock } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useTurnedOff } from '@/features/auth'
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

/** Today, 7 and 30 days for every package; 90 days and all time with advanced analytics. */
export function RangePicker({ value, onChange, advanced }: RangePickerProps) {
  const { t } = useTranslation('analytics')
  // Turned off by an admin, no package brings them back.
  const turnedOff = useTurnedOff('advanced_analytics')

  return (
    // The whole width on a phone, five options sharing it; its own width
    // from a tablet up, each option as wide as its label (sharing an
    // auto width evenly, "30 days" broke onto two lines).
    <div className="w-full sm:w-auto sm:[&_[role=tab]]:basis-auto sm:[&_[role=tab]]:px-3 sm:[&_[role=tab]]:whitespace-nowrap">
      <Segmented
        block
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
            // Faded already says locked; the smallest phones have no room for the lock too.
            icon: locked ? (
              <IconLock aria-hidden className="size-3 max-[359px]:hidden" />
            ) : undefined,
            title: locked ? t(turnedOff ? 'range.turnedOff' : 'range.locked') : undefined,
          }
        })}
      />
    </div>
  )
}
