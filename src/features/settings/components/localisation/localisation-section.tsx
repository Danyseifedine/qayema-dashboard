import { useMemo } from 'react'
import type { Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ComboboxField, FormSection } from '@/shared/components/forms'
import { CURRENCY_OPTIONS } from '@/shared/constants/currencies'
import type { SettingsFormValues } from '../../schemas/settings.schema'

export type LocalisationSectionProps = {
  control: Control<SettingsFormValues>
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
export function LocalisationSection({ control }: LocalisationSectionProps) {
  const { t } = useTranslation('settings')
  const timezones = useMemo(timezoneOptions, [])

  return (
    <FormSection title={t('localisation.title')} description={t('localisation.description')}>
      <ComboboxField
        control={control}
        name="currency"
        label={t('localisation.currencyLabel')}
        required
        options={CURRENCY_OPTIONS}
        placeholder={t('localisation.currencyPlaceholder')}
        emptyText={t('localisation.currencyEmpty')}
        hint={t('localisation.currencyHint')}
      />

      <ComboboxField
        control={control}
        name="timezone"
        label={t('localisation.timezoneLabel')}
        required
        options={timezones}
        placeholder={t('localisation.timezonePlaceholder')}
        emptyText={t('localisation.timezoneEmpty')}
        hint={t('localisation.timezoneHint')}
      />
    </FormSection>
  )
}
