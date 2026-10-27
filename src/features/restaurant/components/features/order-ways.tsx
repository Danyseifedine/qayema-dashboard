import type { ReactNode } from 'react'
import { Segmented, type SegmentedOption } from '@/shared/components/ui'

type OrderWaysProps<T extends string> = {
  label: string
  value: T
  /** Only the ways the package has: one it lacks is not shown at all. */
  options: SegmentedOption<T>[]
  onChange: (next: T) => void
  /** The id the field's label points at. */
  id: string
}

/**
 * Where orders go, as a switch between the ways the package has. With one
 * way there is nothing to pick, so it is named, not offered.
 */
export function OrderWays<T extends string>({
  label,
  value,
  options,
  onChange,
  id,
}: OrderWaysProps<T>): ReactNode {
  if (options.length > 1) {
    return <Segmented aria-label={label} value={value} onChange={onChange} options={options} />
  }
  const only = options[0]
  return only ? (
    <span id={id} className="text-[13px] font-medium text-[var(--text)]">
      {only.label}
    </span>
  ) : null
}
