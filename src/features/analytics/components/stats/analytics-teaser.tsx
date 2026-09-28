import { Eye } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStatsTeaser } from '@/features/analytics/hooks/use-analytics'
import type { Locale } from '@/shared/constants/locales'
import { formatNumber } from '@/shared/utils/format/number'

export type AnalyticsTeaserProps = {
  locale: Locale
}

/**
 * The one number a package without analytics still sees, so the owner knows
 * people are looking and what the numbers would tell them. Nothing while it
 * loads or fails: it is an extra, not the page.
 */
export function AnalyticsTeaser({ locale }: AnalyticsTeaserProps) {
  const { t } = useTranslation('analytics')
  const teaser = useStatsTeaser()

  if (teaser.data === undefined) return null
  const views = teaser.data.views

  return (
    <p className="flex items-center gap-2.5 rounded-[10px] bg-[var(--surface)] px-3.5 py-3 text-[13.5px]">
      <Eye aria-hidden className="size-4 shrink-0 text-accent" />
      <span>{t('teaser.views', { count: views, number: formatNumber(views, locale) })}</span>
    </p>
  )
}
