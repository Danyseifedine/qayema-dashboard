import { zodResolver } from '@hookform/resolvers/zod'
import { IconX } from '@tabler/icons-react'
import { useEffect, useMemo } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/shared/components/feedback'
import { useDishes } from '@/features/menu'
import { Money, StatusChip } from '@/shared/components/data-display'
import { Form } from '@/shared/components/forms'
import { Alert, Button } from '@/shared/components/ui'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { useSubmitOnce } from '@/shared/hooks/use-submit-once'
import { cn } from '@/shared/utils/dom/cn'
import { formatMoney } from '@/shared/utils/format/money'
import { translated } from '@/shared/utils/string/translated'
import { usePreferencesStore } from '@/stores/preferences.store'
import { DishPicker } from '@/features/orders/components/edit/dish-picker'
import { QuantityStepper } from '@/features/orders/components/edit/quantity-stepper'
import { useEditOrder } from '@/features/orders/hooks/use-orders'
import { usePickChoices } from '@/features/orders/hooks/use-pick-choices'
import {
  editOrderFormSchema,
  type EditOrderFormValues,
} from '@/features/orders/schemas/edit-order.schema'
import type { Order } from '@/features/orders/schemas/order.schema'
import { buildsToPick, builtParts, orderTotal, unitPrice } from '@/features/orders/utils/order-edit'
import { choiceParts } from '@/features/orders/utils/order-text'

export type EditOrderDialogProps = {
  /** Null keeps it closed. */
  order: Order | null
  onClose: () => void
}

/**
 * The restaurant changing what an order holds: how many of each line (0
 * takes it off), and dishes added. Lines keep the price they were sold at;
 * added dishes are priced from the menu, and the server has the last word
 * on the total. Saving a new order takes it on.
 */
export function EditOrderDialog({ order, onClose }: EditOrderDialogProps) {
  const { t } = useTranslation('orders')
  const locale = usePreferencesStore((state) => state.locale)
  const choices = usePickChoices()
  const dishes = useDishes()
  const edit = useEditOrder()
  const open = order !== null

  const form = useForm<EditOrderFormValues>({
    resolver: zodResolver(editOrderFormSchema),
    defaultValues: { lines: [], add: [] },
  })
  const added = useFieldArray({ control: form.control, name: 'add' })
  const { formError, applyApiError, clearFormError } = useApiFormErrors(form.setError)

  useEffect(() => {
    if (!order) return
    clearFormError()
    form.reset({
      lines: order.items.map((item) => ({ id: item.id, quantity: item.quantity })),
      add: [],
    })
  }, [order, form, clearFormError])

  const lines = form.watch('lines')
  const adds = form.watch('add')
  const menu = useMemo(() => dishes.data?.data ?? [], [dishes.data])
  // Looked up for every added line on every keystroke: a map, not a search.
  const byId = useMemo(() => new Map(menu.map((dish) => [dish.id, dish])), [menu])
  const dishOf = (id: number) => byId.get(id)

  // In the order's currency: each line in its own, one in the second currency
  // at the rate the order was placed at (today's, for an order without one).
  const total = order
    ? orderTotal(
        [
          ...order.items.map((item, index) => ({
            amount: Number(item.unit_price) * (lines[index]?.quantity ?? 0),
            currency: item.currency,
          })),
          ...adds.flatMap((line) => {
            const dish = dishOf(line.dish_id)
            return dish
              ? [
                  {
                    amount:
                      unitPrice(dish, line.options, line.addons, choices, line.builds, menu) *
                      line.quantity,
                    currency: dish.currency,
                  },
                ]
              : []
          }),
        ],
        order.currency,
        order.exchange_rate ?? dishes.data?.meta.exchange_rate ?? null,
      )
    : 0

  const once = useSubmitOnce()

  const onSubmit = form.handleSubmit((values) =>
    once((done) => {
      if (!order) return done()
      clearFormError()
      edit.mutate(
        {
          id: order.id,
          edit: {
            items: values.lines.filter((line) => line.quantity > 0),
            add: values.add,
            // Taking on a new order means the version on this card.
            guest_updates: order.status === 'placed' ? order.guest_updates : undefined,
          },
        },
        { onSuccess: onClose, onError: (error) => applyApiError(error), onSettled: done },
      )
    }),
  )

  const emptyError =
    form.formState.errors.lines?.root?.message ?? form.formState.errors.lines?.message

  return (
    <Modal open={open} onClose={onClose} busy={edit.isPending} size="lg">
      {order ? (
        // Never taller than the screen: the middle scrolls, so the total and
        // Save stay in view on a short phone.
        <Form onSubmit={onSubmit} className="max-h-[calc(100dvh-24px)] gap-0">
          <ModalBody className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            <ModalHeader
              title={t('edit.title', { reference: order.reference })}
              description={
                order.status === 'placed' ? t('edit.descriptionNew') : t('edit.description')
              }
            />

            {formError ? <Alert variant="error">{formError}</Alert> : null}
            {emptyError ? <Alert variant="error">{emptyError}</Alert> : null}

            <ul className="flex flex-col divide-y-[0.5px] divide-[var(--line)]">
              {order.items.map((item, index) => {
                const quantity = lines[index]?.quantity ?? 0
                const picked = choiceParts(
                  item.options?.variants ?? [],
                  item.options?.addons ?? [],
                  item.options?.builds,
                ).join(' · ')
                return (
                  <li
                    key={item.id}
                    className={cn(
                      'flex items-center justify-between gap-3 py-2.5',
                      quantity === 0 && 'opacity-50',
                    )}
                  >
                    <div className="min-w-0">
                      <p className={cn('text-[13.5px]', quantity === 0 && 'line-through')}>
                        {item.name}
                      </p>
                      <p className="text-[12px] text-[var(--muted)]">
                        {/* Isolated, so choices named in the other script keep
                            the price after them, in Arabic too. */}
                        {picked !== '' ? (
                          <>
                            <bdi>{picked}</bdi>
                            {' · '}
                          </>
                        ) : null}
                        {t('edit.each', {
                          price: formatMoney(Number(item.unit_price), item.currency),
                        })}
                      </p>
                    </div>
                    <QuantityStepper
                      value={quantity}
                      onChange={(next) =>
                        form.setValue(`lines.${index}.quantity`, next, { shouldValidate: true })
                      }
                      label={item.name}
                    />
                  </li>
                )
              })}
              {added.fields.map((field, index) => {
                const dish = dishOf(field.dish_id)
                const name = dish ? translated(dish.name, locale).text : '-'
                return (
                  <li key={field.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[13.5px]">
                        {name} <StatusChip tone="success">{t('edit.new')}</StatusChip>
                      </p>
                      {dish ? (
                        <p className="text-[12px] text-[var(--muted)]">
                          {choiceParts(
                            dish.variants.flatMap((variant) =>
                              variant.options
                                .filter((option) => field.options.includes(option.id))
                                .map((option) => ({
                                  name: translated(variant.name, locale).text,
                                  choice: translated(option.name, locale).text,
                                })),
                            ),
                            dish.addons
                              .filter((addon) => field.addons.includes(addon.id))
                              .map((addon) => ({ name: translated(addon.name, locale).text })),
                            builtParts(
                              buildsToPick(dish, choices, menu),
                              field.builds ?? [],
                              locale,
                            ),
                          ).join(' · ')}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <QuantityStepper
                        value={adds[index]?.quantity ?? field.quantity}
                        min={1}
                        onChange={(next) => form.setValue(`add.${index}.quantity`, next)}
                        label={name}
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-[var(--muted)]"
                        aria-label={t('edit.removeAdded', { name })}
                        onClick={() => added.remove(index)}
                      >
                        <IconX aria-hidden className="size-4" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="flex flex-col gap-2">
              <h3 className="text-[13px] font-medium">{t('edit.addTitle')}</h3>
              {dishes.isError ? (
                <Alert variant="error">{dishes.error.message}</Alert>
              ) : (
                <DishPicker
                  dishes={menu}
                  onAdd={(line) => {
                    added.append(line)
                    void form.trigger('lines')
                  }}
                />
              )}
            </div>
          </ModalBody>

          <ModalFooter align="between" className="shrink-0 items-center">
            <p className="text-[13px] text-[var(--muted)]">
              {t('edit.total')}{' '}
              <Money
                amount={total}
                currency={order.currency}
                className="text-[15px] font-medium text-accent"
              />
            </p>
            {/* On a phone the buttons take their own full-width line. */}
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={edit.isPending}
                className="flex-1 sm:flex-none"
              >
                {t('edit.cancel')}
              </Button>
              <Button type="submit" loading={edit.isPending} className="flex-1 sm:flex-none">
                {t('edit.save')}
              </Button>
            </div>
          </ModalFooter>
        </Form>
      ) : null}
    </Modal>
  )
}
