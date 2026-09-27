import type { Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ChoiceField, SwitchField, TextField, type ChoiceOption } from '@/shared/components/forms'
import type { CardTheme, QrFormValues } from '../../../schemas/qr.schema'

function swatch(colour: string) {
  return (
    <span
      className="block h-7 w-6 rounded-[5px] border-[0.5px] border-[var(--line)]"
      style={{ background: colour }}
    />
  )
}

/** The printable table card the code sits on. The code itself is unaffected. */
export function CardControls({
  control,
  brandColor,
}: {
  control: Control<QrFormValues>
  /** The menu's main colour, so "Your colour" shows the real one. */
  brandColor: string
}) {
  const { t } = useTranslation('qr')
  const themes: ChoiceOption<CardTheme>[] = [
    { value: 'light', label: t('card.light'), preview: swatch('#FFFFFF') },
    { value: 'dark', label: t('card.dark'), preview: swatch('#111418') },
    { value: 'brand', label: t('card.brand'), preview: swatch(brandColor) },
  ]

  return (
    <>
      <ChoiceField
        control={control}
        name="card_theme"
        label={t('card.theme')}
        options={themes}
        hint={t('card.themeHint')}
      />
      <TextField control={control} name="title" label={t('card.title')} maxLength={60} />
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
      <SwitchField control={control} name="show_url" label={t('card.showUrl')} />
    </>
  )
}
