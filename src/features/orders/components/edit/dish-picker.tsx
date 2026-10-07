import { IconPlus } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDishChoices } from '@/features/auth'
import type { Dish } from '@/features/menu'
import { Money } from '@/shared/components/data-display'
import { Button, Combobox, Switch } from '@/shared/components/ui'
import { translated } from '@/shared/utils/string/translated'
import { usePreferencesStore } from '@/stores/preferences.store'
import { QuantityStepper } from '@/features/orders/components/edit/quantity-stepper'
import type { EditOrderFormValues } from '@/features/orders/schemas/edit-order.schema'
import {
  addonsToPick,
  isSellable,
  unitPrice,
  variantsToPick,
} from '@/features/orders/utils/order-edit'

export type DishPickerProps = {
  dishes: readonly Dish[]
  currency: string
  onAdd: (line: EditOrderFormValues['add'][number]) => void
}

/**
 * Adds a dish to the order: the dish, one option of each variant (as the
 * guest's sheet asks), any add-ons, and how many. Dishes hidden from guests
 * can be added too: the kitchen may still have them.
 */
export function DishPicker({ dishes, currency, onAdd }: DishPickerProps) {
  const { t } = useTranslation('orders')
  const locale = usePreferencesStore((state) => state.locale)
  const choices = useDishChoices()
  const [dishId, setDishId] = useState<string | null>(null)
  const [options, setOptions] = useState<Record<number, number>>({})
  const [addons, setAddons] = useState<number[]>([])
  const [quantity, setQuantity] = useState(1)

  const sellable = useMemo(
    () => dishes.filter((dish) => isSellable(dish, choices)),
    [dishes, choices],
  )
  const dish = sellable.find((candidate) => String(candidate.id) === dishId) ?? null
  const variants = dish ? variantsToPick(dish, choices) : []
  const extras = dish ? addonsToPick(dish, choices) : []
  const picked = Object.values(options)
  const ready = dish !== null && variants.every((variant) => options[variant.id] !== undefined)

  const reset = () => {
    setDishId(null)
    setOptions({})
    setAddons([])
    setQuantity(1)
  }

  return (
    <div className="flex flex-col gap-3 rounded-[12px] border-[0.5px] border-[var(--line)] bg-[var(--bg)] p-3">
      <Combobox
        aria-label={t('edit.dish')}
        placeholder={t('edit.dishPlaceholder')}
        value={dishId}
        onChange={(next) => {
          setDishId(next)
          setOptions({})
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
                description: Number(option.price) > 0 ? `+${option.price}` : undefined,
              }))}
            />
          ))
        : null}

      {extras.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {extras.map((addon) => {
            const name = translated(addon.name, locale).text
            return (
              <li key={addon.id} className="flex items-center justify-between gap-3 text-[13px]">
                <span>
                  {name} <span className="text-[var(--muted)]">+{addon.price}</span>
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
            amount={unitPrice(dish, picked, addons, choices) * quantity}
            currency={currency}
            locale={locale}
            className="justify-self-end text-[13px] text-[var(--muted)] sm:ms-auto"
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={!ready}
            leadingIcon={<IconPlus className="size-4" />}
            className="col-span-2 w-full sm:w-auto"
            onClick={() => {
              onAdd({ dish_id: dish.id, quantity, options: picked, addons })
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
