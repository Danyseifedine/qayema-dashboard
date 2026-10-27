import { IconPlus } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Dish } from '@/features/menu'
import { Money } from '@/shared/components/data-display'
import { Button, Combobox, Switch } from '@/shared/components/ui'
import { formatMoney } from '@/shared/utils/format/money'
import { translated } from '@/shared/utils/string/translated'
import { usePreferencesStore } from '@/stores/preferences.store'
import { BuildPicker } from '@/features/orders/components/edit/build-picker'
import { QuantityStepper } from '@/features/orders/components/edit/quantity-stepper'
import { usePickChoices } from '@/features/orders/hooks/use-pick-choices'
import type { EditOrderFormValues } from '@/features/orders/schemas/edit-order.schema'
import {
  addonsToPick,
  buildsToPick,
  isFilled,
  isSellable,
  type BuildToFill,
  type PickedBuild,
  unitPrice,
  variantsToPick,
} from '@/features/orders/utils/order-edit'

export type DishPickerProps = {
  /** Each priced in its own currency (`dish.currency`). */
  dishes: readonly Dish[]
  onAdd: (line: EditOrderFormValues['add'][number]) => void
}

/**
 * Adds a dish to the order: the dish, one option of each variant (as the
 * guest's sheet asks), each build filled (how many parts, a choice in
 * each), any add-ons, and how many. Dishes hidden from guests can be added
 * too: the kitchen may still have them. A build's choices come from the
 * whole menu, so `dishes` is all of it.
 */
export function DishPicker({ dishes, onAdd }: DishPickerProps) {
  const { t } = useTranslation('orders')
  const locale = usePreferencesStore((state) => state.locale)
  const choices = usePickChoices()
  const [dishId, setDishId] = useState<string | null>(null)
  const [options, setOptions] = useState<Record<number, number>>({})
  // Each build's parts by its id: the choice key per part, null until picked.
  const [parts, setParts] = useState<Record<number, (string | null)[]>>({})
  const [addons, setAddons] = useState<number[]>([])
  const [quantity, setQuantity] = useState(1)

  const sellable = useMemo(
    () => dishes.filter((dish) => isSellable(dish, choices, dishes)),
    [dishes, choices],
  )
  const dish = sellable.find((candidate) => String(candidate.id) === dishId) ?? null
  const variants = dish ? variantsToPick(dish, choices) : []
  const builds = useMemo(
    () => (dish ? buildsToPick(dish, choices, dishes) : []),
    [dish, choices, dishes],
  )
  const extras = dish ? addonsToPick(dish, choices) : []
  // Its options, builds and add-ons are in its currency too.
  const currency = dish?.currency ?? ''
  const picked = Object.values(options)
  // A build allowing one count only starts with its parts to fill.
  const partsOf = (build: BuildToFill) =>
    parts[build.id] ??
    (build.parts.length === 1 ? Array.from({ length: build.parts[0]! }, () => null) : undefined)
  const built: PickedBuild[] = builds.flatMap((build) => {
    const keys = partsOf(build)
    return keys?.every((key): key is string => key !== null)
      ? [{ build: build.id, parts: keys }]
      : []
  })
  const ready =
    dish !== null &&
    variants.every((variant) => options[variant.id] !== undefined) &&
    builds.every((build) =>
      isFilled(
        build,
        built.find((mine) => mine.build === build.id),
      ),
    )

  const reset = () => {
    setDishId(null)
    setOptions({})
    setParts({})
    setAddons([])
    setQuantity(1)
  }

  return (
    <div className="flex flex-col gap-3 inset-tile p-3">
      <Combobox
        aria-label={t('edit.dish')}
        placeholder={t('edit.dishPlaceholder')}
        value={dishId}
        onChange={(next) => {
          setDishId(next)
          setOptions({})
          setParts({})
          setAddons([])
          setQuantity(1)
        }}
        emptyText={t('edit.noDish')}
        options={sellable.map((candidate) => ({
          value: String(candidate.id),
          label: translated(candidate.name, locale).text,
          description: candidate.is_available ? undefined : t('edit.hidden'),
        }))}
      />

      {dish
        ? variants.map((variant) => (
            <Combobox
              key={variant.id}
              aria-label={translated(variant.name, locale).text}
              placeholder={translated(variant.name, locale).text}
              searchable={false}
              value={options[variant.id] === undefined ? null : String(options[variant.id])}
              onChange={(next) =>
                setOptions((current) =>
                  next === null ? current : { ...current, [variant.id]: Number(next) },
                )
              }
              options={variant.options.map((option) => ({
                value: String(option.id),
                label: translated(option.name, locale).text,
                description:
                  Number(option.price) > 0
                    ? `+${formatMoney(Number(option.price), currency)}`
                    : undefined,
              }))}
            />
          ))
        : null}

      {builds.map((build) => (
        <BuildPicker
          key={build.id}
          build={build}
          value={partsOf(build)}
          onChange={(next) => setParts((current) => ({ ...current, [build.id]: next }))}
          currency={currency}
          locale={locale}
        />
      ))}

      {extras.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {extras.map((addon) => {
            const name = translated(addon.name, locale).text
            return (
              <li key={addon.id} className="flex items-center justify-between gap-3 text-[13px]">
                <span>
                  {name}{' '}
                  <Money
                    prefix="+"
                    amount={Number(addon.price)}
                    currency={currency}
                    className="text-[var(--muted)]"
                  />
                </span>
                <Switch
                  checked={addons.includes(addon.id)}
                  onChange={(on) =>
                    setAddons((current) =>
                      on ? [...current, addon.id] : current.filter((id) => id !== addon.id),
                    )
                  }
                  aria-label={name}
                />
              </li>
            )
          })}
        </ul>
      ) : null}

      {dish ? (
        // On a phone: how many and the price on one line, Add full width
        // under them. Wider: all three on one line.
        <div className="grid grid-cols-[auto_1fr] items-center gap-3 sm:flex">
          <QuantityStepper
            value={quantity}
            min={1}
            onChange={setQuantity}
            label={t('edit.quantity')}
          />
          <Money
            amount={unitPrice(dish, picked, addons, choices, built, dishes) * quantity}
            currency={currency}
            className="justify-self-end text-[13px] text-[var(--muted)] sm:ms-auto"
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={!ready}
            leadingIcon={<IconPlus className="size-4" />}
            className="col-span-2 w-full sm:w-auto"
            onClick={() => {
              onAdd({
                dish_id: dish.id,
                quantity,
                options: picked,
                addons,
                // Only a dish built from parts says so.
                ...(builds.length > 0 ? { builds: built } : {}),
              })
              reset()
            }}
          >
            {t('edit.addDish')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
