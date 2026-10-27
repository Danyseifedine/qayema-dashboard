import { useTranslation } from 'react-i18next'
import type { QrStats as Stats } from '@/features/qr/schemas/qr.schema'
import { StatTile } from '@/shared/components/data-display'
import { formatNumber } from '@/shared/utils/format/number'
import { usePreferencesStore } from '@/stores/preferences.store'

const PERIODS = ['today', 'week', 'month', 'total'] as const satisfies readonly (keyof Stats)[]

/**
 * Menu visits that came through the QR code, not a shared link: four in a
 * row, or two by two where four would cut the names short.
 */
export function QrStats({ stats }: { stats: Stats }) {
  const { t } = useTranslation('qr')
  const locale = usePreferencesStore((state) => state.locale)

  return (
    // A container can not query itself, so the grid sits in one.
    <div className="@container">
      <dl className="grid grid-cols-2 gap-2 @min-[26rem]:grid-cols-4">
        {PERIODS.map((key) => (
          <StatTile key={key} label={t(`stats.${key}`)} value={formatNumber(stats[key], locale)} />
        ))}
      </dl>
    </div>
  )
}
