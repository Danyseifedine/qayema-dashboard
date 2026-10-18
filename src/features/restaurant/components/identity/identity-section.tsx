import type { Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormSection, TranslatableTextField } from '@/shared/components/forms'
import type { RestaurantFormValues } from '@/features/restaurant/schemas/restaurant.schema'

export type IdentitySectionProps = {
  control: Control<RestaurantFormValues>
  /** The menu's languages as currently chosen in the form, English first. */
  languages: readonly string[]
}

/** What the restaurant is called and how it introduces itself, in each menu language. */
export function IdentitySection({ control, languages }: IdentitySectionProps) {
  const { t } = useTranslation('restaurant')

  return (
    <FormSection title={t('identity.title')} description={t('identity.description')}>
      <TranslatableTextField
        control={control}
        name="name"
        languages={languages}
        label={t('identity.nameLabel')}
        required
        maxLength={255}
        placeholder={{ en: 'Beit Qayema', ar: 'بيت قائمة' }}
        hint={t('identity.nameHint')}
      />

      <TranslatableTextField
        control={control}
        name="description"
        languages={languages}
        label={t('identity.descriptionLabel')}
        optionalText={t('optional')}
        multiline
        rows={3}
        maxLength={2000}
        write={{ kind: 'restaurant' }}
        placeholder={{
          en: 'A sentence or two about your food.',
          ar: 'جملة أو جملتان عن طعامك.',
        }}
      />
    </FormSection>
  )
}
