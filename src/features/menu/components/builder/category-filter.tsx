import type { Locale } from '@/shared/constants/locales'
import { cn } from '@/shared/utils/dom/cn'
import { translated } from '@/shared/utils/string/translated'
import type { Category } from '../../categories/schemas/category.schema'

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

/**
 * Horizontally scrolling chips.
 *
 * A dropdown would hide the categories behind a tap; a row of chips keeps
 * them all one thumb-swipe away, which is how this gets used on a phone.
 */
export function CategoryFilter({
  categories,
  value,
  onChange,
  orphanCount,
  locale,
}: CategoryFilterProps) {
  const chip = (active: boolean) =>
    cn(
      'shrink-0 rounded-[var(--radius-control)] border-[0.5px] px-3.5 py-2 text-[13px] transition-colors',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-on)]',
      active
        ? 'border-accent-border bg-accent-wash font-medium text-accent'
        : 'border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--text)]',
    )

  return (
    <div
      role="tablist"
      aria-label="Filter dishes by category"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === null}
        onClick={() => onChange(null)}
        className={chip(value === null)}
      >
        All
      </button>

      {categories.map((category) => {
        const name = translated(category.name, locale)
        const active = value === category.id
        return (
          <button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(category.id)}
            className={chip(active)}
          >
            {name.missing ? 'Untitled' : name.text}
            <span className="ms-1.5 tabular-nums opacity-60">{category.dishes_count ?? 0}</span>
          </button>
        )
      })}

      {orphanCount > 0 ? (
        <button
          type="button"
          role="tab"
          aria-selected={value === UNCATEGORISED}
          onClick={() => onChange(UNCATEGORISED)}
          className={chip(value === UNCATEGORISED)}
          title="Dishes whose category was deleted"
        >
          No category
          <span className="ms-1.5 tabular-nums opacity-60">{orphanCount}</span>
        </button>
      ) : null}
    </div>
  )
}
