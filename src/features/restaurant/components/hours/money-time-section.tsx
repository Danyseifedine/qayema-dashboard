import { IconCoin } from '@tabler/icons-react'
import { useMemo } from 'react'
import { useController, useWatch, type Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ComboboxField, Field, FormSection } from '@/shared/components/forms'
import { Input, Segmented } from '@/shared/components/ui'
import { CURRENCY_OPTIONS } from '@/shared/constants/currencies'
import type { RestaurantFormValues } from '@/features/restaurant/schemas/restaurant.schema'
import { defaultRate, flipRate, type RateForm } from '@/features/restaurant/utils/exchange-rate'

export type MoneyTimeSectionProps = {
  control: Control<RestaurantFormValues>
}

/**
 * Every timezone this browser knows, so no 400-entry list has to ship. Older
 * browsers without `supportedValuesOf` fall back to whatever they are set to,
 * which is the right answer for the person filling the form in.
 */
function timezoneOptions(): { value: string; label: string }[] {
  const supported =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []

  const names =
    supported.length > 0
      ? supported
      : [Intl.DateTimeFormat().resolvedOptions().timeZone, 'UTC'].filter(Boolean)

  return names.map((name) => ({ value: name, label: name.replace(/_/g, ' ') }))
}

/**
 * The browser's list, plus the saved timezone when the list lacks it: "UTC"
 * and older names (Asia/Calcutta) are not in Chrome's, and a field showing
 * empty would look unset and stop the save.
 */
function withSaved(
  options: { value: string; label: string }[],
  saved: string | null | undefined,
): { value: string; label: string }[] {
  if (!saved || options.some((option) => option.value === saved)) return options
  return [{ value: saved, label: saved.replace(/_/g, ' ') }, ...options]
}

/** Money and time: what every price and every opening hour depends on. */
export function MoneyTimeSection({ control }: MoneyTimeSectionProps) {
  const { t } = useTranslation('restaurant')
  const saved = useWatch({ control, name: 'timezone' })
  const all = useMemo(timezoneOptions, [])
  const timezones = useMemo(() => withSaved(all, saved), [all, saved])
  const [main, second] = useWatch({ control, name: ['currency', 'second_currency'] })
  const rateOne = useController({ control, name: 'rate_one' })
  const rate = useController({ control, name: 'rate' })
  const setRate = (next: RateForm) => {
    rateOne.field.onChange(next.rate_one)
    rate.field.onChange(next.rate)
  }
  // Any currency but the main one, or none.
  const seconds = useMemo(
    () => [
      { value: '', label: t('moneyTime.secondCurrencyNone') },
      ...CURRENCY_OPTIONS.filter((option) => option.value !== main),
    ],
    [main, t],
  )
  const [one, other] = rateOne.field.value === 'second' ? [second, main] : [main, second]

  return (
    <FormSection
      icon={<IconCoin aria-hidden className="size-[18px]" />}
      title={t('moneyTime.title')}
      description={t('moneyTime.description')}
    >
      <ComboboxField
        control={control}
        name="currency"
        label={t('moneyTime.currencyLabel')}
        required
        options={CURRENCY_OPTIONS}
        placeholder={t('moneyTime.currencyPlaceholder')}
        emptyText={t('moneyTime.currencyEmpty')}
        hint={t('moneyTime.currencyHint')}
      />

      <ComboboxField
        control={control}
        name="second_currency"
        label={t('moneyTime.secondCurrencyLabel')}
        options={seconds}
        placeholder={t('moneyTime.secondCurrencyNone')}
        emptyText={t('moneyTime.currencyEmpty')}
        hint={
          second
            ? t('moneyTime.secondCurrencyHintPicked', { second, main })
            : t('moneyTime.secondCurrencyHint', { main })
        }
        // A new pair starts on its usual rate (1 USD = 89,000 LBP), or empty.
        onValueChange={(next) => setRate(defaultRate(main, next))}
      />

      {second ? (
        <Field
          label={t('moneyTime.rateLabel')}
          required
          hint={t('moneyTime.rateHint')}
          error={rate.fieldState.error?.message}
          action={
            <Segmented
              size="sm"
              aria-label={t('moneyTime.rateSide')}
              value={rateOne.field.value}
              onChange={(side) => {
                if (side !== rateOne.field.value)
                  setRate(flipRate({ rate_one: rateOne.field.value, rate: rate.field.value }))
              }}
              options={[
                { value: 'second', label: `1 ${second}` },
                { value: 'main', label: `1 ${main}` },
              ]}
            />
          }
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name={rate.field.name}
              ref={rate.field.ref}
              value={rate.field.value ?? ''}
              onChange={(event) => {
                const raw = event.target.value
                rate.field.onChange(raw === '' ? null : Number(raw))
              }}
              onBlur={rate.field.onBlur}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              dir="ltr"
              prefix={`1 ${one} =`}
              trailing={other}
              className="text-start tabular-nums"
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              tone={invalid ? 'error' : 'default'}
            />
          )}
        </Field>
      ) : null}

      <ComboboxField
        control={control}
        name="timezone"
        label={t('moneyTime.timezoneLabel')}
        required
        options={timezones}
        placeholder={t('moneyTime.timezonePlaceholder')}
        emptyText={t('moneyTime.timezoneEmpty')}
        hint={t('moneyTime.timezoneHint')}
      />
    </FormSection>
  )
}
