import { Pencil, Trash2 } from 'lucide-react'
import { memo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui'
import { localeLabel, type Locale } from '@/shared/constants/locales'
import { cn } from '@/shared/utils/dom/cn'
import { translated } from '@/shared/utils/string/translated'
import type { Category } from '@/features/menu/categories/schemas/category.schema'

export type CategoryCardProps = {
  category: Category
  locale: Locale
  /** The drag grip, supplied by the sortable wrapper. */
  handle: ReactNode
  /**
   * These take the category back rather than closing over it, so the page can
   * pass one callback that never changes identity and the card can skip
   * re-rendering when nothing about it moved.
   */
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

/**
 * One category, as a card rather than a table row: on a phone a row of cells
 * forces a horizontal scroll, while a card stacks and stays tappable.
 */
export const CategoryCard = memo(function CategoryCard({
  category,
  locale,
  handle,
  onEdit,
  onDelete,
}: CategoryCardProps) {
  const { t } = useTranslation('menu')
  const name = translated(category.name, locale)
  const description = translated(category.description, locale)
  const count = category.dishes_count ?? 0

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-[14px] border-[0.5px] border-[var(--line)]',
        'bg-[var(--surface)] ps-1 pe-2 transition-colors hover:border-[var(--line-strong)]',
      )}
    >
      {handle}

      <button
        type="button"
        onClick={() => onEdit(category)}
        className="min-w-0 flex-1 py-3 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]"
      >
        <span className="flex items-center gap-2">
          <span
            className={cn(
              'truncate text-[15px] font-medium tracking-[-0.012em]',
              name.missing && 'text-[var(--faint)] italic',
            )}
          >
            {name.missing ? t('categoryCard.untitled') : name.text}
          </span>
          {name.isFallback ? (
            <span
              title={t('categoryCard.notTranslated', { language: localeLabel(locale) })}
              className="shrink-0 rounded-full bg-status-warn-wash px-1.5 py-0.5 text-[10px] font-medium text-status-warn"
            >
              {name.language?.toUpperCase()}
            </span>
          ) : null}
        </span>
        {!description.missing ? (
          <span className="mt-0.5 block truncate text-[12.5px] text-[var(--muted)]">
            {description.text}
          </span>
        ) : null}
        <span className="mt-0.5 block text-[12px] text-[var(--faint)]">
          {t('categoryCard.dishCount', { count })}
        </span>
      </button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(category)}
        aria-label={
          name.text ? t('categoryCard.edit', { name: name.text }) : t('categoryCard.editUnnamed')
        }
      >
        <Pencil aria-hidden className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(category)}
        aria-label={
          name.text
            ? t('categoryCard.delete', { name: name.text })
            : t('categoryCard.deleteUnnamed')
        }
        className="text-[var(--muted)] hover:bg-status-danger-wash hover:text-status-danger"
      >
        <Trash2 aria-hidden className="size-4" />
      </Button>
    </div>
  )
})
