import { StatTile } from '@/shared/components/data-display'
import type { QrStats as Stats } from '../../schemas/qr.schema'

const PERIODS: { key: keyof Stats; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'total', label: 'All time' },
]

/** Menu visits that came through the QR code, not a shared link. */
export function QrStats({ stats }: { stats: Stats }) {
  return (
    <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {PERIODS.map(({ key, label }) => (
        <StatTile key={key} label={label} value={stats[key].toLocaleString()} />
      ))}
    </dl>
  )
}
