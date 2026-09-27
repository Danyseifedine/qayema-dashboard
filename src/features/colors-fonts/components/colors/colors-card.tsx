import { zodResolver } from '@hookform/resolvers/zod'
import { RotateCcw } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  colorsFormSchema,
  type ColorSetting,
  type ColorsFormValues,
} from '@/features/colors-fonts/schemas/colors-fonts.schema'
import { ColorField, Form, FormActions, FormSection } from '@/shared/components/forms'
import { Button, HelperText } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { MIN_CONTRAST, contrast } from '@/shared/utils/color/contrast'
import { translated, type TranslatableValue } from '@/shared/utils/string/translated'

const HEX = /^#[0-9a-fA-F]{6}$/

export type ColorsCardProps = {
  /** The design in use, in the reader's language. */
  designName: string
  colors: ColorSetting[]
  locale: Locale
  saving: boolean
  /** Only what changed; null puts a colour back to the design's default. */
  onSave: (changes: Record<string, string | null>) => void
}

/** "background_color" → "Background color", for a design with no label. */
function fallbackLabel(key: string): string {
  const words = key.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function labelOf(setting: ColorSetting, locale: Locale): string {
  const label = translated(setting.label as TranslatableValue, locale)
  return label.missing ? fallbackLabel(setting.key) : label.text
}

function valuesOf(colors: ColorSetting[]): ColorsFormValues {
  return {
    colors: Object.fromEntries(
      colors.map((setting) => [
        setting.key,
        (setting.value ?? setting.default ?? '#000000').toUpperCase(),
      ]),
    ),
  }
}

/**
 * Every colour the design in use lets its owner change, and nothing it does
 * not. A new design with five colours shows five fields with no code here:
 * the list, the labels and the defaults all come from its schema.
 */
export function ColorsCard({ designName, colors, locale, saving, onSave }: ColorsCardProps) {
  const { t } = useTranslation('colors-fonts')

  const form = useForm<ColorsFormValues>({
    resolver: zodResolver(colorsFormSchema),
    mode: 'onChange',
    defaultValues: valuesOf(colors),
  })

  // A save (or a design switch elsewhere) brings new values back: they become
  // the saved state, so the form is clean again.
  const stamp = JSON.stringify(colors)
  const loaded = useRef(stamp)
  useEffect(() => {
    if (loaded.current === stamp) return
    loaded.current = stamp
    form.reset(valuesOf(colors))
  }, [stamp, colors, form])

  const current = useWatch({ control: form.control, name: 'colors' })
  const dirty = form.formState.isDirty

  const onSubmit = form.handleSubmit((values) => {
    const changed = Object.keys(form.formState.dirtyFields.colors ?? {})
    onSave(
      Object.fromEntries(
        changed.map((key) => {
          const setting = colors.find((row) => row.key === key)
          const value = values.colors[key]!
          // Back on the default: send null, so a later change to the design's
          // default still reaches this menu.
          const isDefault = setting?.default?.toUpperCase() === value.toUpperCase()
          return [key, isDefault ? null : value]
        }),
      ),
    )
  })

  if (colors.length === 0) {
    return (
      <FormSection title={t('colors.title')}>
        <p className="py-2 text-[13px] text-[var(--muted)]">
          {t('colors.none', { design: designName })}
        </p>
      </FormSection>
    )
  }

  return (
    <FormSection
      title={t('colors.title')}
      description={t('colors.description', { design: designName })}
    >
      <Form onSubmit={onSubmit}>
        <div className="grid gap-x-5 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
          {colors.map((setting) => {
            const name = labelOf(setting, locale)
            const value = current?.[setting.key] ?? ''
            const isDefault = setting.default?.toUpperCase() === value.toUpperCase()
            const partner = setting.contrast_with
              ? colors.find((row) => row.key === setting.contrast_with)
              : undefined
            const partnerValue = partner ? current?.[partner.key] : undefined
            const clashes =
              partner !== undefined &&
              HEX.test(value) &&
              partnerValue !== undefined &&
              HEX.test(partnerValue) &&
              contrast(value, partnerValue) < MIN_CONTRAST

            return (
              <div key={setting.key} className="flex flex-col">
                <ColorField control={form.control} name={`colors.${setting.key}`} label={name} />
                <div className="flex min-h-7 items-start justify-between gap-2 pt-1">
                  {clashes ? (
                    <HelperText tone="warning">
                      {t('colors.contrast', { partner: labelOf(partner, locale) })}
                    </HelperText>
                  ) : (
                    <span />
                  )}
                  {setting.default && !isDefault ? (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto shrink-0 px-0 text-[12px]"
                      aria-label={t('colors.resetLabel', { name })}
                      onClick={() =>
                        form.setValue(`colors.${setting.key}`, setting.default!.toUpperCase(), {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    >
                      <RotateCcw aria-hidden className="size-3" />
                      {t('colors.reset')}
                    </Button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>

        <FormActions align="between">
          <span className="text-[12.5px] text-[var(--muted)]">
            {dirty ? t('colors.unsaved') : t('colors.saved')}
          </span>
          <Button type="submit" loading={saving} disabled={!dirty}>
            {t('colors.save')}
          </Button>
        </FormActions>
      </Form>
    </FormSection>
  )
}
