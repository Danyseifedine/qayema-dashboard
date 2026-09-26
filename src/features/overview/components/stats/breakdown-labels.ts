import { LOCALE_LABELS, type Locale } from '@/shared/constants/locales'
import type { Breakdown } from '../../schemas/stats.schema'
import type { RankedItem } from '../charts/ranked-list'

const DEVICES: Record<string, string> = {
  mobile: 'Phone',
  tablet: 'Tablet',
  desktop: 'Computer',
}

function isLocale(key: string): key is Locale {
  return key in LOCALE_LABELS
}

/** A breakdown as ranked rows, each with its share of the whole. */
export function breakdownItems(
  breakdown: Breakdown,
  kind: 'device' | 'language' | 'plain',
): RankedItem[] {
  const total = breakdown.reduce((sum, row) => sum + row.count, 0)

  return breakdown.map((row) => ({
    id: row.key,
    label:
      row.key === 'unknown'
        ? 'Unknown'
        : kind === 'device'
          ? (DEVICES[row.key] ?? row.key)
          : kind === 'language' && isLocale(row.key)
            ? LOCALE_LABELS[row.key]
            : row.key,
    value: row.count,
    detail: total > 0 ? `${Math.round((row.count / total) * 100)}%` : undefined,
  }))
}
