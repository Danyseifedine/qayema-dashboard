import type { Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ImageField } from '@/features/uploads'
import { FieldGroup, FormSection } from '@/shared/components/forms'
import type { RestaurantFormValues } from '@/features/restaurant/schemas/restaurant.schema'

export type BrandingSectionProps = {
  control: Control<RestaurantFormValues>
  currentLogoUrl: string | null
  currentCoverUrl: string | null
}

/**
 * The two pictures the menu is built around. The logo cannot be cleared
 * (every menu has to show something), so only the cover offers a remove.
 */
export function BrandingSection({
  control,
  currentLogoUrl,
  currentCoverUrl,
}: BrandingSectionProps) {
  const { t } = useTranslation('restaurant')

  return (
    <FormSection title={t('branding.title')} description={t('branding.description')}>
      <FieldGroup>
        <ImageField
          control={control}
          name="logo"
          label={t('branding.logoLabel')}
          required
          aspect="square"
          context="logo"
          removable={false}
          currentUrl={currentLogoUrl}
          hint={t('branding.logoHint')}
        />
        <ImageField
          control={control}
          name="cover_image"
          label={t('branding.coverLabel')}
          optionalText={t('optional')}
          context="cover_image"
          currentUrl={currentCoverUrl}
          hint={t('branding.coverHint')}
        />
      </FieldGroup>
    </FormSection>
  )
}
