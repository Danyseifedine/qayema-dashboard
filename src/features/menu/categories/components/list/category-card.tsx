import { Pencil, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { cn } from '@/shared/utils/dom/cn'
import { translated } from '@/shared/utils/string/translated'
import type { Category } from '../../schemas/category.schema'

export type CategoryCardProps = {
  category: Category
  locale: Locale
  /** The drag grip, supplied by the sortable wrapper. */
  handle: ReactNode
  onEdit: () => void
  onDelete: () => void
  className?: string
}

/**
 * One category, as a card rather than a table row: on a phone a row of cells
 * forces a horizontal scroll, while a card stacks and stays tappable.
 */
export function CategoryCard({
  category,
  locale,
  handle,
  onEdit,
  onDelete,
  className,
}: CategoryCardProps) {
  const name = translated(category.name, locale)
  const count = category.dishes_count ?? 0

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-[14px] border-[0.5px] border-[var(--line)]',
        'bg-[var(--surface)] ps-1 pe-2 transition-colors hover:border-[var(--line-strong)]',
        className,
      )}
    >
      {handle}

      <button
        type="button"
        onClick={onEdit}
        className="min-w-0 flex-1 py-3 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]"
      >
        <span className="flex items-center gap-2">
          <span
            className={cn(
              'truncate text-[15px] font-medium tracking-[-0.012em]',
              name.missing && 'text-[var(--faint)] italic',
            )}
          >
            {name.missing ? 'Untitled category' : name.text}
          </span>
          {name.isFallback ? (
            <span
              title={`Not translated into ${locale === 'en' ? 'English' : 'Arabic'}`}
              className="shrink-0 rounded-full bg-status-warn-wash px-1.5 py-0.5 text-[10px] font-medium text-status-warn"
            >
              {locale === 'en' ? 'AR' : 'EN'}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-[12px] text-[var(--muted)]">
          {count === 1 ? '1 dish' : `${count} dishes`}
        </span>
      </button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onEdit}
        aria-label={`Edit ${name.text || 'category'}`}
      >
        <Pencil aria-hidden className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        aria-label={`Delete ${name.text || 'category'}`}
        className="text-[var(--muted)] hover:bg-status-danger-wash hover:text-status-danger"
      >
        <Trash2 aria-hidden className="size-4" />
      </Button>
    </div>
  )
}
