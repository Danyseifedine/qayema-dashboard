import type { Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FieldGroup, FormSection, ImageField } from '@/shared/components/forms'
import type { SettingsFormValues } from '../../schemas/settings.schema'

export type BrandingSectionProps = {
  control: Control<SettingsFormValues>
  currentLogoUrl: string | null
  currentCoverUrl: string | null
}

/**
 * The two pictures the menu is built around. The logo cannot be cleared —
 * every menu has to show something — so only the cover offers a remove.
 */
export function BrandingSection({
  control,
  currentLogoUrl,
  currentCoverUrl,
}: BrandingSectionProps) {
  const { t } = useTranslation('settings')

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
