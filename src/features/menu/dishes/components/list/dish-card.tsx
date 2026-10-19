import { IconPhotoOff } from '@tabler/icons-react'
import { memo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Money } from '@/shared/components/data-display'
import { RowActions, Switch } from '@/shared/components/ui'
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
 * A dish as a row card: a small photo at the start, the name and price on
 * one line so prices read down the list, the ingredients in full, and along
 * the foot the availability switch, because marking something sold out is
 * the thing an owner does most often and usually from a phone mid-service.
 * Edit and delete sit at the other end of that foot, so the words keep the
 * card's whole width even on a narrow phone.
 *
 * It fills the grid cell it is given (`h-full`), so two cards side by side
 * keep their switch rows level.
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
    <article className="flex h-full glass-card rounded-card py-3 pe-3">
      {/* The grip runs down the whole start edge, so the card reads as
          something to drag; the rest of it stays a tap to edit. */}
      {handle}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-1 items-start gap-3">
          {/* Only the photo dims for a sold-out dish: its name, price and switch
            stay readable (and editable) at full contrast. */}
          <div
            className={cn(
              'size-[76px] shrink-0 overflow-hidden rounded-card bg-[var(--hover-wash)]',
              !dish.is_available && 'opacity-50',
            )}
          >
            {dish.image_url ? (
              <img
                src={dish.image_url}
                alt=""
                loading="lazy"
                // Off the main thread: a list of photos decoding synchronously
                // stutters the scroll on the phone this is edited from.
                decoding="async"
                className="size-full object-cover"
              />
            ) : (
              <div className="grid size-full place-items-center text-[var(--faint)]">
                <IconPhotoOff aria-hidden className="size-5" />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
            <div className="flex items-start justify-between gap-2">
              <h3
                dir="auto"
                className={cn(
                  // The page's own font, not the headings': at this size the display
                  // face crowds a name together.
                  'min-w-0 flex-1 [font-family:inherit] text-[15px] leading-snug font-medium tracking-[-0.012em] break-words',
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
                  className="shrink-0 text-[14px] font-semibold text-accent"
                />
              ) : null}
            </div>

            {!ingredients.missing ? (
              // Two lines, so a long list of ingredients never walls the card in.
              <p
                dir="auto"
                className="line-clamp-2 text-[12px] leading-snug break-words text-[var(--muted)]"
              >
                {ingredients.text}
              </p>
            ) : null}

            {choices.length > 0 || !dish.is_available ? (
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] font-medium text-[var(--faint)]">
                {!dish.is_available ? (
                  <span className="rounded-full bg-status-danger-wash px-2 py-0.5 text-[10px] tracking-[0.06em] text-status-danger uppercase">
                    {t('dishCard.soldOut')}
                  </span>
                ) : null}
                {choices.length > 0 ? <span>{choices.join(' · ')}</span> : null}
              </p>
            ) : null}
          </div>
        </div>

        {/* The switch, then edit and delete at the far end. */}
        <div className="mt-2 -mb-1 flex items-center gap-1">
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

          <div className="ms-auto flex items-center gap-0.5">
            <RowActions
              editLabel={
                name.text ? t('dishCard.edit', { name: name.text }) : t('dishCard.editUnnamed')
              }
              deleteLabel={
                name.text ? t('dishCard.delete', { name: name.text }) : t('dishCard.deleteUnnamed')
              }
              onEdit={() => onEdit(dish)}
              onDelete={() => onDelete(dish)}
            />
          </div>
        </div>
      </div>
    </article>
  )
})
