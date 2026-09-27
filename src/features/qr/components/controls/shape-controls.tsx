import type { Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ChoiceField, type ChoiceOption } from '@/shared/components/forms'
import type { CornerStyle, DotStyle, EyeStyle, QrFormValues } from '@/features/qr/schemas/qr.schema'
import {
  CORNER_PREVIEWS,
  DOT_PREVIEWS,
  EYE_PREVIEWS,
} from '@/features/qr/components/controls/shape-previews'

export function ShapeControls({ control }: { control: Control<QrFormValues> }) {
  const { t } = useTranslation('qr')

  const dotOptions: ChoiceOption<DotStyle>[] = [
    { value: 'square', label: t('shapes.square'), preview: DOT_PREVIEWS.square },
    { value: 'dots', label: t('shapes.dotsStyle'), preview: DOT_PREVIEWS.dots },
    { value: 'rounded', label: t('shapes.rounded'), preview: DOT_PREVIEWS.rounded },
    {
      value: 'extra-rounded',
      label: t('shapes.extraRounded'),
      preview: DOT_PREVIEWS['extra-rounded'],
    },
    { value: 'classy', label: t('shapes.classy'), preview: DOT_PREVIEWS.classy },
    {
      value: 'classy-rounded',
      label: t('shapes.classyRounded'),
      preview: DOT_PREVIEWS['classy-rounded'],
    },
  ]

  const cornerOptions: ChoiceOption<CornerStyle>[] = [
    { value: 'square', label: t('shapes.square'), preview: CORNER_PREVIEWS.square },
    {
      value: 'extra-rounded',
      label: t('shapes.rounded'),
      preview: CORNER_PREVIEWS['extra-rounded'],
    },
    { value: 'dot', label: t('shapes.circle'), preview: CORNER_PREVIEWS.dot },
  ]

  const eyeOptions: ChoiceOption<EyeStyle>[] = [
    { value: 'square', label: t('shapes.square'), preview: EYE_PREVIEWS.square },
    { value: 'dot', label: t('shapes.circle'), preview: EYE_PREVIEWS.dot },
  ]

  return (
    <>
      <ChoiceField
        control={control}
        name="dot_style"
        label={t('shapes.dots')}
        options={dotOptions}
      />
      <ChoiceField
        control={control}
        name="corner_style"
        label={t('shapes.cornerFrames')}
        options={cornerOptions}
        hint={t('shapes.cornerFramesHint')}
      />
      <ChoiceField
        control={control}
        name="eye_style"
        label={t('shapes.cornerCentres')}
        options={eyeOptions}
      />
    </>
  )
}
