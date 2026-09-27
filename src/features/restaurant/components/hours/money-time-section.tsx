import { useMemo } from 'react'
import type { Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ComboboxField, FormSection } from '@/shared/components/forms'
import { CURRENCY_OPTIONS } from '@/shared/constants/currencies'
import type { RestaurantFormValues } from '@/features/restaurant/schemas/restaurant.schema'

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

/** Money and time: what every price and every opening hour depends on. */
export function MoneyTimeSection({ control }: MoneyTimeSectionProps) {
  const { t } = useTranslation('restaurant')
  const timezones = useMemo(timezoneOptions, [])

  return (
    <FormSection title={t('moneyTime.title')} description={t('moneyTime.description')}>
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
