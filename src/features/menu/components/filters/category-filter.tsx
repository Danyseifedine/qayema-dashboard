import { useTranslation } from 'react-i18next'
import { FilterChips } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { nameOr } from '@/shared/utils/string/translated'
import { categoryIcon } from '@/features/menu/categories/constants/category-icons'
import type { Category } from '@/features/menu/categories/schemas/category.schema'

export type CategoryFilterProps = {
  categories: Category[]
  /** Null means "all", -1 means "no category". */
  value: number | null
  onChange: (value: number | null) => void
  /** How many dishes have no category, so the chip can be hidden when zero. */
  orphanCount: number
  locale: Locale
}

export const UNCATEGORISED = -1

/** Every dish, one category's, or those left without one; each with its count. */
export function CategoryFilter({
  categories,
  value,
  onChange,
  orphanCount,
  locale,
}: CategoryFilterProps) {
  const { t } = useTranslation('menu')

  return (
    <FilterChips
      label={t('categoryFilter.label')}
      value={value}
      onChange={onChange}
      chips={[
        { value: null, label: t('categoryFilter.all') },
        ...categories.map((category) => {
          const Icon = categoryIcon(category.icon)
          return {
            value: category.id,
            icon: Icon ? <Icon aria-hidden className="-ms-1 size-4" stroke={1.8} /> : undefined,
            label: nameOr(category.name, locale, t('categoryFilter.untitled')),
            count: category.dishes_count ?? 0,
          }
        }),
        ...(orphanCount > 0
          ? [
              {
                value: UNCATEGORISED,
                label: t('categoryFilter.noCategory'),
                count: orphanCount,
                title: t('categoryFilter.noCategoryHint'),
              },
            ]
          : []),
      ]}
    />
  )
}
