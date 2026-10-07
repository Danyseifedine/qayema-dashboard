import { zodResolver } from '@hookform/resolvers/zod'
import { IconX } from '@tabler/icons-react'
import { useEffect, useMemo, useRef } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useDishChoices } from '@/features/auth'
import { useDishes } from '@/features/menu'
import { Money } from '@/shared/components/data-display'
import { Form, FormActions } from '@/shared/components/forms'
import { Alert, Button } from '@/shared/components/ui'
import { useApiFormErrors } from '@/shared/hooks/use-api-form-errors'
import { useSubmitOnce } from '@/shared/hooks/use-submit-once'
import { cn } from '@/shared/utils/dom/cn'
import { translated } from '@/shared/utils/string/translated'
import { usePreferencesStore } from '@/stores/preferences.store'
import { DishPicker } from '@/features/orders/components/edit/dish-picker'
import { QuantityStepper } from '@/features/orders/components/edit/quantity-stepper'
import { useEditOrder } from '@/features/orders/hooks/use-orders'
import {
  editOrderFormSchema,
  type EditOrderFormValues,
} from '@/features/orders/schemas/edit-order.schema'
import type { Order } from '@/features/orders/schemas/order.schema'
import { unitPrice } from '@/features/orders/utils/order-edit'

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
  const ref = useRef<HTMLDialogElement>(null)
  const locale = usePreferencesStore((state) => state.locale)
  const choices = useDishChoices()
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

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const lines = form.watch('lines')
  const adds = form.watch('add')
  const menu = useMemo(() => dishes.data?.data ?? [], [dishes.data])
  const dishOf = (id: number) => menu.find((dish) => dish.id === id)

  const total =
    (order?.items ?? []).reduce(
      (sum, item, index) => sum + Number(item.unit_price) * (lines[index]?.quantity ?? 0),
      0,
    ) +
    adds.reduce((sum, line) => {
      const dish = dishOf(line.dish_id)
      return dish ? sum + unitPrice(dish, line.options, line.addons, choices) * line.quantity : sum
    }, 0)

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
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault()
        if (!edit.isPending) onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current && !edit.isPending) onClose()
      }}
      className={cn(
        'm-auto w-[min(94vw,520px)] rounded-[16px] border-[0.5px] border-[var(--line)] p-0',
        'bg-[var(--surface)] text-[var(--text)] shadow-pop',
      )}
    >
      {order ? (
        // Never taller than the screen: the middle scrolls, so the total and
        // Save stay in view on a short phone.
        <Form onSubmit={onSubmit} className="max-h-[calc(100dvh-2.5rem)] gap-0">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 pb-0 sm:p-5 sm:pb-0">
            <div>
              <h2 className="font-display text-[19px] leading-tight">
                {t('edit.title', { reference: order.reference })}
              </h2>
              <p className="mt-1.5 text-[13px] leading-snug text-[var(--muted)]">
                {order.status === 'placed' ? t('edit.descriptionNew') : t('edit.description')}
              </p>
            </div>

            {formError ? <Alert variant="error">{formError}</Alert> : null}
            {emptyError ? <Alert variant="error">{emptyError}</Alert> : null}

            <ul className="flex flex-col divide-y-[0.5px] divide-[var(--line)]">
              {order.items.map((item, index) => {
                const quantity = lines[index]?.quantity ?? 0
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
                        {[
                          ...(item.options?.variants.map((variant) => variant.choice) ?? []),
                          ...(item.options?.addons.map((addon) => `+ ${addon.name}`) ?? []),
                        ]
                          .concat([
                            t('edit.each', {
                              price: Number(item.unit_price).toFixed(2),
                            }),
                          ])
                          .join(' · ')}
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
                        {name}{' '}
                        <span className="rounded-full bg-status-success-wash px-1.5 py-0.5 text-[11px] text-status-success">
                          {t('edit.new')}
                        </span>
                      </p>
                      {dish ? (
                        <p className="text-[12px] text-[var(--muted)]">
                          {[
                            ...dish.variants.flatMap((variant) =>
                              variant.options
                                .filter((option) => field.options.includes(option.id))
                                .map((option) => translated(option.name, locale).text),
                            ),
                            ...dish.addons
                              .filter((addon) => field.addons.includes(addon.id))
                              .map((addon) => `+ ${translated(addon.name, locale).text}`),
                          ].join(' · ')}
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
                        size="icon"
                        className="size-8 text-[var(--muted)]"
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
                  currency={order.currency}
                  onAdd={(line) => {
                    added.append(line)
                    void form.trigger('lines')
                  }}
                />
              )}
            </div>
          </div>

          <FormActions
            align="between"
            className="mt-4 shrink-0 items-center border-t-[0.5px] border-[var(--line)] p-3.5"
          >
            <p className="text-[13px] text-[var(--muted)]">
              {t('edit.total')}{' '}
              <Money
                amount={total}
                currency={order.currency}
                locale={locale}
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
          </FormActions>
        </Form>
      ) : null}
    </dialog>
  )
}
