import { IconPlus } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addonGroupRule, type Dish } from '@/features/menu'
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
  addonGroupsToPick,
  addonsToPick,
  buildsToPick,
  firstSize,
  groupsMet,
  isFilled,
  pickedIn,
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
 * each), any add-ons (within each add-on group's fewest and most), and
 * how many. Dishes hidden from guests can be added
 * too: the kitchen may still have them. A build's choices come from the
 * whole menu, so `dishes` is all of it.
 */
export function DishPicker({ dishes, onAdd }: DishPickerProps) {
  const { t } = useTranslation('orders')
  const { t: tMenu } = useTranslation('menu')
  const locale = usePreferencesStore((state) => state.locale)
  const choices = usePickChoices()
  const [dishId, setDishId] = useState<string | null>(null)
  const [options, setOptions] = useState<Record<number, number>>({})
  // Each build's parts by its id: the choice key per part, null until picked.
  const [parts, setParts] = useState<Record<number, (string | null)[]>>({})
  // Each build's size by its id, for one priced by size; its first until picked.
  const [sizes, setSizes] = useState<Record<number, string>>({})
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
  const groups = dish ? addonGroupsToPick(dish, choices) : []
  // Its options, builds and add-ons are in its currency too.
  const currency = dish?.currency ?? ''
  const picked = Object.values(options)
  // A build allowing one count only starts with its parts to fill.
  const partsOf = (build: BuildToFill) =>
    parts[build.id] ??
    (build.parts.length === 1 ? Array.from({ length: build.parts[0]! }, () => null) : undefined)
  const sizeOf = (build: BuildToFill) => sizes[build.id] ?? firstSize(build)
  const built: PickedBuild[] = builds.flatMap((build) => {
    const keys = partsOf(build)
    const size = sizeOf(build)
    return keys?.every((key): key is string => key !== null)
      ? [{ build: build.id, parts: keys, ...(size === undefined ? {} : { size }) }]
      : []
  })
  const ready =
    dish !== null &&
    variants.every((variant) => options[variant.id] !== undefined) &&
    groupsMet(groups, addons) &&
    builds.every((build) =>
      isFilled(
        build,
        built.find((mine) => mine.build === build.id),
      ),
    )

  // One add-on and its switch; off once its group has all it may take.
  const addonRow = (addon: Dish['addons'][number], off: boolean) => {
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
          disabled={off}
          onChange={(on) =>
            setAddons((current) =>
              on ? [...current, addon.id] : current.filter((id) => id !== addon.id),
            )
          }
          aria-label={name}
        />
      </li>
    )
  }

  const reset = () => {
    setDishId(null)
    setOptions({})
    setParts({})
    setSizes({})
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
          setSizes({})
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
          size={sizeOf(build)}
          onSizeChange={(size, kept) => {
            setSizes((current) => ({ ...current, [build.id]: size }))
            if (kept) setParts((current) => ({ ...current, [build.id]: kept }))
          }}
          currency={currency}
          locale={locale}
        />
      ))}

      {extras.length > 0 ? (
        <ul className="flex flex-col gap-1.5">{extras.map((addon) => addonRow(addon, false))}</ul>
      ) : null}

      {groups.map((group) => {
        const full = group.max !== null && pickedIn(group, addons) >= group.max
        return (
          <div key={group.id} className="flex flex-col gap-1.5" data-pick-group={group.id}>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="font-medium">{translated(group.name, locale).text}</span>
              <span className="text-[12px] text-[var(--muted)]">
                {tMenu(...addonGroupRule(group))}
              </span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {group.addons.map((addon) => addonRow(addon, full && !addons.includes(addon.id)))}
            </ul>
          </div>
        )
      })}

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
