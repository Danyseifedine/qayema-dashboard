import type { Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormSection, PhoneField } from '@/shared/components/forms'
import type { RestaurantFormValues } from '@/features/restaurant/schemas/restaurant.schema'
import { LocationField } from '@/features/restaurant/components/contact/location-field'

export type ContactSectionProps = {
  control: Control<RestaurantFormValues>
  /** The map link as it stands, so the preview follows it. */
  locationUrl: string | null
  onPickLocation: (url: string) => void
}

/** How a guest reaches the restaurant: a number to call and a place to go. */
export function ContactSection({ control, locationUrl, onPickLocation }: ContactSectionProps) {
  const { t } = useTranslation('restaurant')

  return (
    <FormSection title={t('contact.title')} description={t('contact.description')}>
      <PhoneField
        control={control}
        name="phone"
        countryName="country_code"
        label={t('contact.phoneLabel')}
        required
        hint={t('contact.phoneHint')}
      />

      <LocationField
        control={control}
        name="google_maps_url"
        value={locationUrl}
        onPick={onPickLocation}
      />
    </FormSection>
  )
}
