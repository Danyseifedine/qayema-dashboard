import type { Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { SwitchField, TextField } from '@/shared/components/forms'
import type { QrFormValues } from '@/features/qr/schemas/qr.schema'

/** The words on the printable table card. The code itself is unaffected. */
export function CardTextControls({ control }: { control: Control<QrFormValues> }) {
  const { t } = useTranslation('qr')

  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
      <TextField
        control={control}
        name="title"
        label={t('card.title')}
        maxLength={60}
        placeholder={t('card.titlePlaceholder')}
      />
      <TextField
        control={control}
        name="subtitle"
        label={t('card.subtitle')}
        optionalText={t('card.optional')}
        maxLength={80}
        placeholder={t('card.subtitlePlaceholder')}
      />
      <TextField
        control={control}
        name="cta"
        label={t('card.cta')}
        optionalText={t('card.optional')}
        maxLength={60}
        placeholder={t('card.ctaPlaceholder')}
      />
      <div className="sm:self-end sm:pb-1.5">
        <SwitchField control={control} name="show_url" label={t('card.showUrl')} />
      </div>
    </div>
  )
}
