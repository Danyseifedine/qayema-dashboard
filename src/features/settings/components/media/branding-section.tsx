import type { Control } from 'react-hook-form'
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
  return (
    <FormSection title="Branding" description="JPEG, PNG or WebP, up to 10 MB each.">
      <FieldGroup>
        <ImageField
          control={control}
          name="logo"
          label="Logo"
          required
          aspect="square"
          context="logo"
          removable={false}
          currentUrl={currentLogoUrl}
          hint="Every menu shows a logo, so this can be replaced but not removed."
        />
        <ImageField
          control={control}
          name="cover_image"
          label="Cover image"
          optionalText="optional"
          context="cover_image"
          currentUrl={currentCoverUrl}
          hint="Cropped to 1920 x 600 and converted to WebP."
        />
      </FieldGroup>
    </FormSection>
  )
}
