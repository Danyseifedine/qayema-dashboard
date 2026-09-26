import { Lock } from 'lucide-react'
import { Segmented } from '@/shared/components/ui'
import {
  BASIC_RANGES,
  RANGE_LABELS,
  STATS_RANGES,
  type StatsRange,
} from '../../schemas/stats.schema'

export type RangePickerProps = {
  value: StatsRange
  onChange: (range: StatsRange) => void
  /** Whether the package includes the longer ranges. */
  advanced: boolean
}

/** 7 and 30 days for every package; 90 days and all time with advanced analytics. */
export function RangePicker({ value, onChange, advanced }: RangePickerProps) {
  return (
    <Segmented
      aria-label="Range"
      size="sm"
      value={value}
      onChange={onChange}
      options={STATS_RANGES.map((range) => {
        const locked = !advanced && !BASIC_RANGES.includes(range)
        return {
          value: range,
          label: RANGE_LABELS[range],
          disabled: locked,
          icon: locked ? <Lock aria-hidden className="size-3" /> : undefined,
          title: locked ? 'Comes with advanced analytics' : undefined,
        }
      })}
    />
  )
}
