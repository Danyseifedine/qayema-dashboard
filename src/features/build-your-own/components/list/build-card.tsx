import { IconChefHat } from '@tabler/icons-react'
import { Trans, useTranslation } from 'react-i18next'
import { categoryIcon, type Category, type Dish } from '@/features/menu'
import { Money, StatusChip } from '@/shared/components/data-display'
import { RowActions } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { nameOr } from '@/shared/utils/string/translated'
import { usePreferencesStore } from '@/stores/preferences.store'
import {
  offeredDishes,
  tickedDishes,
  type Build,
} from '@/features/build-your-own/schemas/build.schema'
import { sizesSummary } from '@/features/build-your-own/utils/build-labels'
import { cheapestCents, type BuildPart } from '@/features/build-your-own/utils/build-price'

export type BuildCardProps = {
  build: Build
  /** The dish it is on, priced in its own currency. */
  dish: Dish
  /** Every dish of the restaurant, for a category's choices. */
  dishes: readonly Dish[]
  categories: readonly Category[]
  /** Menu text's language. */
  locale: Locale
  onEdit: () => void
  onDelete: () => void
}

/**
 * One build, which is its dish: the dish's icon and name, the title guests
 * see above the choices when it is another, what it is
 * in a line ("Halves and thirds, from Pizzas"), the least a guest pays for
 * it (the dish's price and the build's cheapest, as the menu's card says
 * "from"), a warning when fewer than two choices can be picked (guests do
 * not see it then), and edit and delete.
 */
export function BuildCard({
  build,
  dish,
  dishes,
  categories,
  locale,
  onEdit,
  onDelete,
}: BuildCardProps) {
  const { t } = useTranslation('build-your-own')
  // The build's own words are the menu's; the line about it is the dashboard's.
  const ui = usePreferencesStore((state) => state.locale)
  const dishName = nameOr(dish.name, locale, t('card.untitled'))
  const name = nameOr(build.name, locale, t('card.untitled'))

  const fromCategory = build.category_id !== null
  const pickable = offeredDishes(dishes, build.category_id, dish.id, dish.currency)
  const offered = tickedDishes(pickable, build.dish_ids)
  const saved = new Map(build.choices.map((choice) => [choice.dish_id, choice.part_prices]))
  const choices: BuildPart[] = fromCategory
    ? offered.map((each) => ({ price: each.price!, part_prices: saved.get(each.id) }))
    : build.choices.flatMap((choice) =>
        choice.price === null ? [] : [{ price: choice.price, part_prices: choice.part_prices }],
      )
  const category = categories.find((each) => each.id === build.category_id)
  const sizes = sizesSummary(t, build.shape, build.parts, ui)
  const categoryName = nameOr(category?.name ?? {}, locale, t('card.untitled'))
  const summary = fromCategory
    ? offered.length < pickable.length
      ? t('summary.categorySome', {
          sizes,
          category: categoryName,
          shown: offered.length,
          total: pickable.length,
        })
      : t('summary.category', { sizes, category: categoryName })
    : t('summary.own', { sizes, count: build.choices.length })
  const Icon = categoryIcon(dish.icon) ?? IconChefHat
  const from =
    Math.round(Number(dish.price ?? 0) * 100) + cheapestCents(build.shape, build.parts, choices)

  return (
    <article data-dish={dish.id} className="flex h-full gap-3 glass-card rounded-card p-3">
      <div className="grid size-14 shrink-0 place-items-center rounded-card bg-accent-wash text-[var(--text)]">
        <Icon aria-hidden className="size-6" stroke={1.8} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3
          dir="auto"
          className="[font-family:inherit] text-[15px] leading-snug font-medium tracking-[-0.012em] break-words"
        >
          {dishName}
        </h3>
        {/* A build saved here is titled with its dish's name: said once. */}
        {name === dishName ? null : (
          <p dir="auto" className="truncate text-[12.5px] text-[var(--muted)]">
            {name}
          </p>
        )}
        <p className="text-[12.5px] leading-snug text-[var(--muted)]">{summary}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {/* Guests are not offered a build with one choice: it has no price yet. */}
          {choices.length >= 2 ? (
            <span className="text-[13px] text-accent">
              <Trans
                t={t}
                i18nKey="card.from"
                components={{
                  price: (
                    <Money amount={from / 100} currency={dish.currency} className="font-semibold" />
                  ),
                }}
              />
            </span>
          ) : (
            <StatusChip tone="warning" title={t('card.hiddenHint')}>
              {t('card.hidden')}
            </StatusChip>
          )}
        </div>
      </div>

      <div className="-me-1 flex shrink-0 items-start gap-0.5">
        <RowActions
          editLabel={t('card.edit', { name, dish: dishName })}
          deleteLabel={t('card.delete', { name, dish: dishName })}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </article>
  )
}
