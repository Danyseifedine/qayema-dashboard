import { useTranslation } from 'react-i18next'
import type { QrStats as Stats } from '@/features/qr/schemas/qr.schema'
import { formatNumber } from '@/shared/utils/format/number'
import { usePreferencesStore } from '@/stores/preferences.store'

const PERIODS = ['today', 'week', 'month', 'total'] as const satisfies readonly (keyof Stats)[]

/**
 * Menu visits that came through the QR code, not a shared link: four in a
 * row, or two by two, each number beside its name, where four would cut
 * the names short.
 */
export function QrStats({ stats }: { stats: Stats }) {
  const { t } = useTranslation('qr')
  const locale = usePreferencesStore((state) => state.locale)

  return (
    // A container can not query itself, so the grid sits in one.
    <div className="@container">
      <dl className="grid grid-cols-2 gap-2 @min-[26rem]:grid-cols-4">
        {PERIODS.map((key) => (
          <div
            key={key}
            className="flex min-w-0 items-baseline justify-between gap-2 rounded-tile border-[0.5px] border-[var(--line)] px-3 py-2.5 @min-[26rem]:flex-col @min-[26rem]:items-start @min-[26rem]:justify-start @min-[26rem]:gap-1"
          >
            <dt className="truncate text-[11px] text-[var(--muted)] sm:text-[12.5px]">
              {t(`stats.${key}`)}
            </dt>
            <dd className="text-[17px] leading-none font-semibold tabular-nums sm:text-[20px]">
              {formatNumber(stats[key], locale)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
