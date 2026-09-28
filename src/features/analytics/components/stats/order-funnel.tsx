import { useTranslation } from 'react-i18next'
import type { AdvancedStats } from '@/features/analytics/schemas/analytics.schema'
import { formatNumber } from '@/shared/utils/format/number'
import { usePreferencesStore } from '@/stores/preferences.store'

export type OrderFunnelProps = {
  funnel: NonNullable<AdvancedStats['funnel']>
}

/**
 * From opening the menu to ordering. Each step says what share of the
 * visitors got that far.
 */
export function OrderFunnel({ funnel }: OrderFunnelProps) {
  const { t } = useTranslation('analytics')
  const locale = usePreferencesStore((state) => state.locale)
  const steps = [
    { id: 'visitors', label: t('funnel.visitors'), value: funnel.visitors },
    { id: 'carted', label: t('funnel.carted'), value: funnel.carted },
    { id: 'ordered', label: t('funnel.ordered'), value: funnel.ordered },
  ]

  return (
    <ol className="flex flex-col gap-3" aria-label={t('funnel.title')}>
      {steps.map((step) => {
        const share = funnel.visitors > 0 ? Math.min(step.value / funnel.visitors, 1) : 0
        return (
          <li key={step.id} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span>{step.label}</span>
              <span className="shrink-0 tabular-nums">
                <span className="me-2 text-[12px] text-[var(--muted)]">
                  {Math.round(share * 100)}%
                </span>
                <span className="font-semibold">{formatNumber(step.value, locale)}</span>
              </span>
            </div>
            <div aria-hidden className="h-2 overflow-hidden rounded-full bg-[var(--hover-wash)]">
              <div
                className="h-full rounded-full bg-[var(--status-success)] transition-[width] duration-500"
                style={{ width: `${share * 100}%` }}
              />
            </div>
          </li>
        )
      })}
    </ol>
  )
}
