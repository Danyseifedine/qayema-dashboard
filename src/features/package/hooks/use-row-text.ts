import { useTranslation } from 'react-i18next'
import type { Package, PackageLimit } from '@/features/package/schemas/package.schema'
import type { PackageRow } from '@/features/package/utils/package-rows'
import { formatNumber } from '@/shared/utils/format/number'

const NOUNS = {
  dish_limit: 'dishes',
  category_limit: 'categories',
  social_link_limit: 'socialLinks',
} as const satisfies Record<PackageLimit, string>

/**
 * A row as a card line: "150 dishes", "Unlimited categories", or the
 * feature's name. A limit of null is unlimited, which reads better as a word.
 */
export function useRowText() {
  const { t, i18n } = useTranslation('package')

  return (row: PackageRow, pkg: Package): string => {
    if (row.kind === 'flag') return t(`rows.${row.key}`)

    const value = pkg.features[row.key]
    const noun = NOUNS[row.key]
    return value === null
      ? t(`card.limits.${noun}Unlimited`)
      : t(`card.limits.${noun}`, { count: value, number: formatNumber(value, i18n.language) })
  }
}
