import type { ReactNode } from 'react'
import { useWatch, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ChoiceField, ColorField, type ChoiceOption } from '@/shared/components/forms'
import { Switch } from '@/shared/components/ui'
import type { GradientType, QrFormValues } from '@/features/qr/schemas/qr.schema'

/** Where the gradient starts when it is switched on: the brand's violet. */
const GRADIENT_START = '#7C3AED'

const GRADIENT_PREVIEWS: Record<GradientType, ReactNode> = {
  linear: (
    <span className="block size-7 rounded-[6px] bg-gradient-to-br from-current to-transparent" />
  ),
  radial: (
    <span className="block size-7 rounded-full bg-[radial-gradient(circle,currentColor,transparent_75%)]" />
  ),
}

export function ColorControls({ form }: { form: UseFormReturn<QrFormValues> }) {
  const { t } = useTranslation('qr')
  const { control, setValue } = form
  const gradient = useWatch({ control, name: 'dot_gradient' })
  const on = gradient !== null

  const gradientOptions: ChoiceOption<GradientType>[] = [
    { value: 'linear', label: t('colors.linear'), preview: GRADIENT_PREVIEWS.linear },
    { value: 'radial', label: t('colors.radial'), preview: GRADIENT_PREVIEWS.radial },
  ]

  return (
    <>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <ColorField control={control} name="dot_color" label={t('colors.dots')} />
        <ColorField control={control} name="background" label={t('colors.background')} />
        <ColorField control={control} name="corner_color" label={t('colors.cornerFrames')} />
        <ColorField control={control} name="eye_color" label={t('colors.cornerCentres')} />
      </div>

      <div className="flex items-center justify-between gap-3.5 pt-2">
        <div className="flex flex-col gap-0.5">
          <span id="qr-gradient-label" className="text-[14px] text-[var(--text)]">
            {t('colors.gradient')}
          </span>
          <span id="qr-gradient-desc" className="text-[12px] leading-[1.45] text-[var(--muted)]">
            {t('colors.gradientDescription')}
          </span>
        </div>
        <Switch
          checked={on}
          onChange={(checked) =>
            setValue('dot_gradient', checked ? GRADIENT_START : null, { shouldDirty: true })
          }
          aria-labelledby="qr-gradient-label"
          aria-describedby="qr-gradient-desc"
        />
      </div>

      {on ? (
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <ColorField control={control} name="dot_gradient" label={t('colors.secondColor')} />
          <ChoiceField
            control={control}
            name="gradient_type"
            label={t('colors.direction')}
            options={gradientOptions}
          />
        </div>
      ) : null}
    </>
  )
}
