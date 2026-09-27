import { useWatch, type Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ChoiceField, SwitchField, type ChoiceOption } from '@/shared/components/forms'
import type { LogoSize, QrFormValues } from '@/features/qr/schemas/qr.schema'

export function LogoControls({
  control,
  hasLogo,
}: {
  control: Control<QrFormValues>
  /** Whether the restaurant has a logo to place at all. */
  hasLogo: boolean
}) {
  const { t } = useTranslation('qr')
  const on = useWatch({ control, name: 'logo' })

  const sizes: ChoiceOption<LogoSize>[] = [
    { value: 'small', label: t('logo.small') },
    { value: 'medium', label: t('logo.medium') },
    { value: 'large', label: t('logo.large') },
  ]

  return (
    <>
      <SwitchField
        control={control}
        name="logo"
        label={t('logo.label')}
        description={hasLogo ? t('logo.description') : t('logo.noLogo')}
        disabled={!hasLogo}
      />
      {on && hasLogo ? (
        <ChoiceField
          control={control}
          name="logo_size"
          label={t('logo.size')}
          options={sizes}
          hint={t('logo.sizeHint')}
        />
      ) : null}
    </>
  )
}
