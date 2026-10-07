import { IconPhotoOff, IconPencil, IconTrash } from '@tabler/icons-react'
import { memo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Money } from '@/shared/components/data-display'
import { Button, Switch } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { cn } from '@/shared/utils/dom/cn'
import { translated } from '@/shared/utils/string/translated'
import type { Dish } from '@/features/menu/dishes/schemas/dish.schema'

export type DishCardProps = {
  dish: Dish
  currency: string
  locale: Locale
  handle: ReactNode
  /** Count the dish's variants and add-ons on its face, when each is on. */
  showVariants: boolean
  showAddons: boolean
  /**
   * These take the dish back rather than closing over it, so the page can pass
   * one callback that never changes identity and the card can skip re-rendering
   * when nothing about it moved. On a menu of three hundred that is the
   * difference between one card re-rendering and all of them.
   */
  onEdit: (dish: Dish) => void
  onDelete: (dish: Dish) => void
  onToggleAvailability: (dish: Dish, isAvailable: boolean) => void
}

/**
 * A dish as a card: photo, name, price, and the availability switch right on
 * the face of it, because marking something sold out is the thing an owner
 * does most often and usually from a phone mid-service.
 *
 * It fills the grid cell it is given (`h-full`) so a long description cannot
 * make one card taller than the one beside it, and the switch row lines up
 * across the row.
 */
export const DishCard = memo(function DishCard({
  dish,
  currency,
  locale,
  handle,
  showVariants,
  showAddons,
  onEdit,
  onDelete,
  onToggleAvailability,
}: DishCardProps) {
  const { t } = useTranslation('menu')
  const name = translated(dish.name, locale)
  const ingredients = translated(dish.ingredients, locale)
  // A dish with no price of its own is priced by its variants: the card
  // shows the least a guest pays, as the menu does.
  const pricedByVariants = dish.price === null && showVariants && dish.variants.length > 0
  const price = pricedByVariants
    ? dish.variants.reduce(
        (sum, variant) =>
          sum +
          (variant.options.length > 0
            ? Math.min(...variant.options.map((o) => Number(o.price)))
            : 0),
        0,
      )
    : dish.price === null
      ? null
      : Number(dish.price)
  const choices = [
    showVariants && dish.variants.length > 0
      ? t('dishCard.variants', { count: dish.variants.length })
      : null,
    showAddons && dish.addons.length > 0
      ? t('dishCard.addons', { count: dish.addons.length })
      : null,
  ].filter((part) => part !== null)

  return (
    <article
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-[14px] border-[0.5px] border-[var(--line)]',
        'bg-[var(--surface)] transition-colors hover:border-[var(--line-strong)]',
      )}
    >
      {/* Only the photo dims for a sold-out dish: its name, price and switch
          stay readable (and editable) at full contrast. */}
      <div className={cn('relative', !dish.is_available && '[&>:first-child]:opacity-60')}>
        {dish.image_url ? (
          <img
            src={dish.image_url}
            alt=""
            loading="lazy"
            // Off the main thread: a grid of photos decoding synchronously
            // stutters the scroll on the phone this is edited from.
            decoding="async"
            className="aspect-[4/3] w-full bg-[var(--color-sand)] object-cover"
          />
        ) : (
          <div className="grid aspect-[4/3] w-full place-items-center bg-[var(--hover-wash)] text-[var(--faint)]">
            <IconPhotoOff aria-hidden className="size-6" />
          </div>
        )}

        <div className="absolute inset-x-1 top-1 flex items-start justify-between">
          {handle}
          {!dish.is_available ? (
            <span className="rounded-full bg-overlay-pill px-2 py-1 text-[10px] font-medium tracking-[0.08em] text-white uppercase">
              {t('dishCard.soldOut')}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3
            className={cn(
              'min-w-0 flex-1 text-[15px] font-medium tracking-[-0.012em]',
              name.missing && 'text-[var(--faint)] italic',
            )}
          >
            {name.missing ? t('dishCard.untitled') : name.text}
          </h3>
          {price !== null ? (
            <Money
              amount={price}
              currency={currency}
              locale={locale}
              className="shrink-0 text-[15px] font-medium text-accent"
            />
          ) : null}
        </div>

        {!ingredients.missing ? (
          <p className="line-clamp-2 text-[12.5px] leading-relaxed text-[var(--muted)]">
            {ingredients.text}
          </p>
        ) : null}

        {choices.length > 0 ? (
          <p className="text-[12px] font-medium text-[var(--muted)]">{choices.join(' · ')}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--muted)]">
            <Switch
              checked={dish.is_available}
              onChange={(isAvailable) => onToggleAvailability(dish, isAvailable)}
              aria-label={
                name.text
                  ? t('dishCard.isAvailable', { name: name.text })
                  : t('dishCard.isAvailableUnnamed')
              }
            />
            <span>{dish.is_available ? t('dishCard.available') : t('dishCard.hidden')}</span>
          </label>

          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(dish)}
              aria-label={
                name.text ? t('dishCard.edit', { name: name.text }) : t('dishCard.editUnnamed')
              }
            >
              <IconPencil aria-hidden className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(dish)}
              aria-label={
                name.text ? t('dishCard.delete', { name: name.text }) : t('dishCard.deleteUnnamed')
              }
              className="text-[var(--muted)] hover:bg-status-danger-wash hover:text-status-danger"
            >
              <IconTrash aria-hidden className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
})
