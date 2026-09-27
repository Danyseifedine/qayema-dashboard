import { useTranslation } from 'react-i18next'
import { StatTile } from '@/shared/components/data-display'
import type { QrStats as Stats } from '../../schemas/qr.schema'

const PERIODS = ['today', 'week', 'month', 'total'] as const satisfies readonly (keyof Stats)[]

/** Menu visits that came through the QR code, not a shared link. */
export function QrStats({ stats }: { stats: Stats }) {
  const { t } = useTranslation('qr')

  return (
    <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {PERIODS.map((key) => (
        <StatTile key={key} label={t(`stats.${key}`)} value={stats[key].toLocaleString()} />
      ))}
    </dl>
  )
}
