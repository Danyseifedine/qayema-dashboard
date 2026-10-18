import type { Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ChoiceField, type ChoiceOption } from '@/shared/components/forms'
import type { LogoSize, QrFormValues } from '@/features/qr/schemas/qr.schema'

/** How much of the code the logo covers. Its switch is on the Logo tile. */
export function LogoControls({ control }: { control: Control<QrFormValues> }) {
  const { t } = useTranslation('qr')

  const sizes: ChoiceOption<LogoSize>[] = [
    { value: 'small', label: t('logo.small') },
    { value: 'medium', label: t('logo.medium') },
    { value: 'large', label: t('logo.large') },
  ]

  return (
    <>
      <p className="text-[13px] leading-snug text-[var(--muted)]">{t('logo.description')}</p>
      <ChoiceField
        control={control}
        name="logo_size"
        label={t('logo.size')}
        options={sizes}
        hint={t('logo.sizeHint')}
      />
    </>
  )
}
