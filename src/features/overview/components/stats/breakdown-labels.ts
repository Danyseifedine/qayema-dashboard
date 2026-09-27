import { t } from '@/lib/i18n'
import { MENU_LANGUAGES } from '@/shared/constants/menu-languages'
import type { Breakdown } from '../../schemas/stats.schema'
import type { RankedItem } from '../charts/ranked-list'

/** Visits by language as ranked rows, each with its share of the whole. */
export function languageItems(breakdown: Breakdown): RankedItem[] {
  const total = breakdown.reduce((sum, row) => sum + row.count, 0)

  return breakdown.map((row) => ({
    id: row.key,
    label:
      MENU_LANGUAGES[row.key]?.name ??
      (row.key === 'unknown' ? t('overview:analytics.languages.unknown') : row.key),
    value: row.count,
    detail: total > 0 ? `${Math.round((row.count / total) * 100)}%` : undefined,
  }))
}
