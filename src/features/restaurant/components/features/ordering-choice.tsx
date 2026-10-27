import { useTranslation } from 'react-i18next'
import type { AuthRestaurant, OrderMode, OrderType } from '@/features/auth'
import { Field } from '@/shared/components/forms'
import { Switch } from '@/shared/components/ui'
import { AskGuestsFor } from '@/features/restaurant/components/features/ask-guests-for'
import { OrderWays } from '@/features/restaurant/components/features/order-ways'
import { useSaveOrdering } from '@/features/restaurant/hooks/use-ordering-save'

const ORDER_TYPES: readonly OrderType[] = ['delivery', 'pickup']

type OrderingChoiceProps = {
  ordering: AuthRestaurant['ordering']
  /** The package has orders on WhatsApp (`ordering`). */
  whatsappIncluded: boolean
  /** The package has orders in the menu (`menu_ordering`). */
  menuIncluded: boolean
}

/**
 * How guests send their orders: to WhatsApp, or in the menu, with delivery,
 * pickup or both. Each way is a package switch of its own: one the package
 * lacks is not shown, and with only one way that is the way (the server
 * sends it as `mode`). One way at a time, so the
 * owner never wonders where an order went. At least one kind stays on, or
 * nobody could order. Ordering at the table is a feature of its own, with
 * its own row. Saves on change.
 */
export function OrderingChoice({ ordering, whatsappIncluded, menuIncluded }: OrderingChoiceProps) {
  const { t } = useTranslation('features')
  const save = useSaveOrdering()
  const { mode, types } = ordering
  // On WhatsApp the guest picks delivery or pickup only once the address is asked.
  const asksType = mode === 'menu' || ordering.whatsapp_fields.away.address !== 'off'

  const setMode = (next: OrderMode) => {
    if (next !== mode) save.mutate({ mode: next, types })
  }
  const setType = (type: OrderType, on: boolean) => {
    const next = on ? [...types, type] : types.filter((current) => current !== type)
    // Kept in the server's order, so the optimistic copy matches what comes back.
    save.mutate({ mode, types: ORDER_TYPES.filter((current) => next.includes(current)) })
  }

  return (
    <div className="mt-2.5 grid gap-3 inset-tile p-3">
      <Field
        label={t('orders.modeLabel')}
        hint={t(mode === 'menu' ? 'orders.menuHint' : 'orders.whatsappHint')}
        className="pt-0"
      >
        {({ id }) => (
          <OrderWays
            id={id}
            label={t('orders.modeLabel')}
            value={mode}
            onChange={setMode}
            options={[
              ...(whatsappIncluded
                ? [{ value: 'whatsapp' as const, label: t('orders.whatsapp') }]
                : []),
              ...(menuIncluded ? [{ value: 'menu' as const, label: t('orders.dashboard') }] : []),
            ]}
          />
        )}
      </Field>

      {mode === 'whatsapp' ? <AskGuestsFor set="away" fields={ordering.whatsapp_fields} /> : null}

      {asksType ? (
        <fieldset className="grid gap-2.5">
          <legend className="pb-2 text-[12.5px] font-medium text-[var(--text)]">
            {t('orders.typesLabel')}
          </legend>
          {ORDER_TYPES.map((type) => {
            const on = types.includes(type)
            const labelId = `order-type-${type}`
            const hintId = `order-type-${type}-hint`
            return (
              <div key={type} className="flex items-start justify-between gap-3.5">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span id={labelId} className="text-[13px] text-[var(--text)]">
                    {t(`orders.types.${type}`)}
                  </span>
                  <span id={hintId} className="text-[11.5px] leading-[1.45] text-[var(--muted)]">
                    {t(
                      mode === 'menu'
                        ? `orders.typeHints.${type}`
                        : `orders.whatsappTypeHints.${type}`,
                    )}
                  </span>
                </div>
                <Switch
                  checked={on}
                  // The last kind left on stays on.
                  disabled={on && types.length === 1}
                  onChange={(next) => setType(type, next)}
                  aria-labelledby={labelId}
                  aria-describedby={hintId}
                />
              </div>
            )
          })}
        </fieldset>
      ) : null}
    </div>
  )
}
