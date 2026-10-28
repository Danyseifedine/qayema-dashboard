import { IconChefHat, IconPizza, IconSearch } from '@tabler/icons-react'
import { useId, useMemo, useState, type ReactNode } from 'react'
import { useController, type Control } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { categoryIcon, useCategories } from '@/features/menu'
import { Money } from '@/shared/components/data-display'
import { Field } from '@/shared/components/forms'
import { Button, CheckRow, Input } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { nameOr } from '@/shared/utils/string/translated'
import type { OfferFormValues } from '@/features/offers/schemas/offer.schema'
import { usePricedDishes, type OfferDish } from '@/features/offers/hooks/use-priced-dishes'
import { discountedCents, secondCents } from '@/features/offers/utils/discount'
import { dishGroups, type DishGroup } from '@/features/offers/utils/dish-groups'

export type DishPickerProps = {
  control: Control<OfferFormValues>
  /** The main currency, which an amount off is in. */
  currency: string
  /** Main per one of the second currency; null without one. */
  exchangeRate: string | null
  locale: Locale
  /** The discount being set, to show each chosen dish's new price; null for none. */
  discount: { type: OfferFormValues['discount_type']; value: number } | null
}

type Discount = NonNullable<DishPickerProps['discount']>

/**
 * The dishes an offer is for: the restaurant's dishes to tick, found by
 * name, grouped as the menu has them: the dishes guests build first, in a
 * group of their own with a word on how they are priced, then each
 * category, each group with "Select all". A chosen dish shows its price
 * before and after the discount (a dish priced by its sizes, each size:
 * "Small $8 becomes $6.40"; on a 2nd item deal, what the second one
 * costs), or a word when the discount would take all of its price (so it
 * does not apply).
 */
export function DishPicker({ control, currency, exchangeRate, locale, discount }: DishPickerProps) {
  const { t } = useTranslation('offers')
  // Each shown in its own currency; an amount off counts at the rate there.
  const dishes = usePricedDishes({ locale, currency, exchangeRate })
  const categories = useCategories()
  const { field, fieldState } = useController({ control, name: 'dish_ids' })
  const [query, setQuery] = useState('')
  const chosen = field.value

  // An offer's deal dish (this one's too) is never one to discount: the server refuses it.
  const all = (dishes.data ?? []).filter((dish) => !dish.deal)
  const needle = query.trim().toLocaleLowerCase(locale)
  const shown =
    needle === '' ? all : all.filter((dish) => dish.name.toLocaleLowerCase(locale).includes(needle))
  const categoryList = useMemo(() => categories.data?.data ?? [], [categories.data])
  const groups = dishGroups(
    shown,
    categoryList.map((category) => category.id),
  )

  const toggle = (id: number) =>
    field.onChange(chosen.includes(id) ? chosen.filter((other) => other !== id) : [...chosen, id])

  const titleOf = (group: DishGroup<OfferDish>): string | null => {
    if (group.kind === 'built') return t('editor.builtGroup')
    if (group.kind === 'category') {
      const category = categoryList.find((each) => each.id === group.id)
      return nameOr(category?.name ?? {}, locale, t('deal.untitledCategory'))
    }
    // A heading only beside categories: alone (or while they load) it is just the list.
    return categories.data && groups.length > 1 ? t('editor.otherDishes') : null
  }

  return (
    <Field
      label={t('editor.dishes')}
      optionalText={t('editor.chosen', { count: chosen.length })}
      hint={t('editor.dishesHint')}
      error={fieldState.error?.message}
    >
      {({ describedBy }) => (
        <div className="flex flex-col gap-2" aria-describedby={describedBy}>
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('editor.searchDishes')}
            aria-label={t('editor.searchDishes')}
            leadingIcon={<IconSearch aria-hidden className="size-4" />}
          />
          <div
            role="group"
            aria-label={t('editor.dishes')}
            className="flex max-h-[26rem] flex-col gap-3 overflow-y-auto"
          >
            {all.length === 0 && !dishes.isPending ? (
              <p className="px-1 py-3 text-[13px] text-[var(--muted)]">{t('editor.noDishes')}</p>
            ) : shown.length === 0 && !dishes.isPending ? (
              <p className="px-1 py-3 text-[13px] text-[var(--muted)]">{t('editor.noMatch')}</p>
            ) : null}
            {groups.map((group) => (
              <GroupOfDishes
                key={group.kind === 'category' ? group.id : group.kind}
                group={group}
                title={titleOf(group)}
                chosen={chosen}
                onChange={field.onChange}
              >
                {group.dishes.map((dish) => {
                  const on = chosen.includes(dish.id)
                  return (
                    <CheckRow
                      key={dish.id}
                      on={on}
                      onClick={() => toggle(dish.id)}
                      trailing={
                        <DishPrice
                          dish={dish}
                          deal={on && discount !== null && discount.value > 0 ? discount : null}
                        />
                      }
                    >
                      {dish.built ? <BuiltName dish={dish} /> : dish.name}
                    </CheckRow>
                  )
                })}
              </GroupOfDishes>
            ))}
          </div>
        </div>
      )}
    </Field>
  )
}

/**
 * One group of the picker under its heading, with "Select all" (or "Clear"
 * once every one is ticked). The dishes guests build stand apart: their
 * heading wears the build icon and says how they are priced.
 */
function GroupOfDishes({
  group,
  title,
  chosen,
  onChange,
  children,
}: {
  group: DishGroup<OfferDish>
  /** Null: no heading (the only group). */
  title: string | null
  chosen: number[]
  onChange: (ids: number[]) => void
  children: ReactNode
}) {
  const { t } = useTranslation('offers')
  const headingId = useId()
  const ids = group.dishes.map((dish) => dish.id)
  const allOn = ids.every((id) => chosen.includes(id))
  const built = group.kind === 'built'

  const selectAll = title ? (
    <Button
      variant="link"
      size="xs"
      className="h-auto shrink-0 px-0"
      onClick={() =>
        onChange(
          allOn
            ? chosen.filter((id) => !ids.includes(id))
            : [...chosen, ...ids.filter((id) => !chosen.includes(id))],
        )
      }
      aria-label={
        allOn ? t('editor.clearGroup', { group: title }) : t('editor.selectGroup', { group: title })
      }
    >
      {allOn ? t('editor.clear') : t('editor.selectAll')}
    </Button>
  ) : null

  return (
    <div
      role="group"
      aria-labelledby={title ? headingId : undefined}
      className={
        built ? 'inset-tile flex flex-col gap-1 rounded-tile p-1.5' : 'flex flex-col gap-1'
      }
    >
      {title && built ? (
        <div className="flex items-start gap-2.5 px-1 pt-0.5 pb-1">
          <span className="grid size-8 shrink-0 place-items-center rounded-tile bg-accent-wash text-accent">
            <IconPizza aria-hidden className="size-[18px]" stroke={1.7} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span id={headingId} className="text-[13.5px] font-medium">
              {title}
            </span>
            <span className="text-[12px] leading-snug text-[var(--muted)]">
              {t('editor.builtGroupNote')}
            </span>
          </span>
          {selectAll}
        </div>
      ) : title ? (
        <div className="flex items-center gap-2 px-2.5 pt-1">
          <span
            id={headingId}
            dir="auto"
            className="min-w-0 flex-1 truncate text-[11px] font-medium tracking-[0.12em] text-[var(--faint)] uppercase"
          >
            {title}
          </span>
          {selectAll}
        </div>
      ) : null}
      {children}
    </div>
  )
}

/** A build's dish by its own icon (the chef's hat without one) and name. */
function BuiltName({ dish }: { dish: OfferDish }) {
  const Icon = categoryIcon(dish.icon) ?? IconChefHat
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Icon aria-hidden className="size-4 shrink-0 text-accent" stroke={1.7} />
      <span className="truncate">{dish.name}</span>
    </span>
  )
}

/**
 * What a dish costs at the end of its row: its price, each size's, or on a
 * chosen dish what the discount makes of it; a word when the discount would
 * take all of it. A build's dish has none of its own (its group says how it
 * is priced).
 */
function DishPrice({ dish, deal }: { dish: OfferDish; deal: Discount | null }) {
  const { t } = useTranslation('offers')
  if (dish.built) return null
  const cents = dish.reference
  // The discount would take all of it, so the dish keeps its price.
  const missed =
    deal !== null &&
    deal.type !== 'second' &&
    dish.sizes.length === 0 &&
    cents !== null &&
    cents > 0 &&
    discountedCents(cents, deal.type, deal.value, dish.rate) === cents
  if (missed) {
    return (
      <span className="shrink-0 text-[12px] text-status-warn">
        <Money amount={cents / 100} currency={dish.currency} /> {t('editor.notApplied')}
      </span>
    )
  }
  if (dish.sizes.length > 0) {
    return (
      <span className="shrink-0 text-end text-[12.5px] text-[var(--muted)]">
        {dish.sizes.map((size, index) => (
          <span key={size.name} className="block sm:inline">
            {index > 0 ? <span className="hidden sm:inline"> · </span> : null}
            <span dir="auto">{size.name}</span>{' '}
            <PriceAfter cents={size.cents} deal={deal} rate={dish.rate} currency={dish.currency} />
          </span>
        ))}
      </span>
    )
  }
  if (cents === null) return null
  return (
    <span className="shrink-0 text-[12.5px] text-[var(--muted)]">
      <PriceAfter cents={cents} deal={deal} rate={dish.rate} currency={dish.currency} />
    </span>
  )
}

/**
 * A price, and what the discount makes of it: "$12 becomes $9.60", or on a
 * 2nd item deal "$12, 2nd $6" (or "2nd free"). As it is without a deal, or
 * when the deal would take all of it.
 */
function PriceAfter({
  cents,
  deal,
  rate,
  currency,
}: {
  cents: number
  deal: Discount | null
  rate: number
  currency: string
}) {
  const { t } = useTranslation('offers')
  const was = <Money amount={cents / 100} currency={currency} />
  if (deal?.type === 'second') {
    const second = secondCents(cents, deal.value)
    return second === 0 ? (
      <Trans t={t} i18nKey="editor.secondFree" components={{ was }} />
    ) : (
      <Trans
        t={t}
        i18nKey="editor.secondPrice"
        components={{ was, now: <Money amount={second / 100} currency={currency} /> }}
      />
    )
  }
  const after = deal === null ? cents : discountedCents(cents, deal.type, deal.value, rate)
  return after === cents ? (
    was
  ) : (
    <Trans
      t={t}
      i18nKey="editor.newPrice"
      components={{ was, now: <Money amount={after / 100} currency={currency} /> }}
    />
  )
}
