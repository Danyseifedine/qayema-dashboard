import { zodResolver } from '@hookform/resolvers/zod'
import { IconRotate } from '@tabler/icons-react'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  designSettingsFormSchema,
  type DesignSetting,
  type DesignSettingsFormValues,
} from '@/features/appearance/schemas/appearance.schema'
import {
  ChoiceField,
  ColorField,
  Form,
  FormActions,
  FormSection,
  SwitchField,
  TextField,
} from '@/shared/components/forms'
import { Button, HelperText } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { MIN_CONTRAST, contrast } from '@/shared/utils/color/contrast'
import { cn } from '@/shared/utils/dom/cn'
import { translated, type TranslatableValue } from '@/shared/utils/string/translated'

const HEX = /^#[0-9a-fA-F]{6}$/

export type DesignSettingsCardProps = {
  /** The design in use, in the reader's language. */
  designName: string
  settings: DesignSetting[]
  locale: Locale
  saving: boolean
  /** Only what changed; null puts a setting back to the design's default. */
  onSave: (changes: Record<string, string | boolean | null>) => void
}

/** "background_color" → "Background color", for a design with no label. */
function humanise(key: string): string {
  const words = key.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function labelOf(setting: DesignSetting, locale: Locale): string {
  const label = translated(setting.label as TranslatableValue, locale)
  return label.missing ? humanise(setting.key) : label.text
}

/** What the form holds for a setting: never null, so every field is controlled. */
function formValue(setting: DesignSetting): string | boolean {
  const value = setting.value ?? setting.default
  if (setting.type === 'boolean') return value === true
  if (setting.type === 'color') return String(value ?? '#000000').toUpperCase()
  return String(value ?? '')
}

function valuesOf(settings: DesignSetting[]): DesignSettingsFormValues {
  return { settings: Object.fromEntries(settings.map((row) => [row.key, formValue(row)])) }
}

function isDefault(setting: DesignSetting, value: string | boolean | undefined): boolean {
  if (setting.type === 'color') {
    return String(setting.default ?? '').toUpperCase() === String(value ?? '').toUpperCase()
  }
  return formValue({ ...setting, value: null }) === value
}

/**
 * Every setting the design in use lets its owner change, and nothing it does
 * not. A new design with five colours and a switch shows five colour fields
 * and a switch with no code here: the list, the labels, the types and the
 * defaults all come from its schema.
 */
export function DesignSettingsCard({
  designName,
  settings,
  locale,
  saving,
  onSave,
}: DesignSettingsCardProps) {
  const { t } = useTranslation('appearance')
  const schema = useMemo(() => designSettingsFormSchema(settings), [settings])

  const form = useForm<DesignSettingsFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: valuesOf(settings),
  })

  // A save (or a design switch elsewhere) brings new values back: they become
  // the saved state, so the form is clean again.
  const stamp = JSON.stringify(settings)
  const loaded = useRef(stamp)
  useEffect(() => {
    if (loaded.current === stamp) return
    loaded.current = stamp
    form.reset(valuesOf(settings))
  }, [stamp, settings, form])

  const dirty = form.formState.isDirty
  const colors = settings.filter((row) => row.type === 'color')
  const others = settings.filter((row) => row.type !== 'color')

  const onSubmit = form.handleSubmit((values) => {
    const changed = Object.keys(form.formState.dirtyFields.settings ?? {})
    onSave(
      Object.fromEntries(
        changed.map((key) => {
          const setting = settings.find((row) => row.key === key)!
          const value = values.settings[key]!
          // Back on the default: send null, so a later change to the design's
          // default still reaches this menu.
          return [key, isDefault(setting, value) ? null : value]
        }),
      ),
    )
  })

  if (settings.length === 0) {
    return (
      <FormSection title={designName}>
        <p className="py-2 text-[13px] text-[var(--muted)]">
          {t('settings.none', { design: designName })}
        </p>
      </FormSection>
    )
  }

  return (
    <FormSection title={designName} description={t('settings.description', { design: designName })}>
      <Form onSubmit={onSubmit}>
        {colors.length > 0 ? (
          <Group title={t('settings.colorsTitle')}>
            {colors.map((setting) => (
              <Tile key={setting.key}>
                <ColorSetting form={form} setting={setting} colors={colors} locale={locale} />
              </Tile>
            ))}
          </Group>
        ) : null}

        {others.length > 0 ? (
          <Group title={t('settings.optionsTitle')}>
            {others.map((setting) => {
              const name = `settings.${setting.key}` as const
              const label = labelOf(setting, locale)

              // A switch is small, so it takes one cell like a colour; a
              // choice or a line of text needs the room of the whole row.
              return setting.type === 'boolean' ? (
                <Tile key={setting.key}>
                  <SwitchField control={form.control} name={name} label={label} className="pt-0" />
                </Tile>
              ) : (
                <Tile key={setting.key} wide>
                  {setting.type === 'select' ? (
                    <ChoiceField
                      control={form.control}
                      name={name}
                      label={label}
                      className="pt-0"
                      options={setting.options.map((option) => ({
                        value: option,
                        label: humanise(option),
                      }))}
                    />
                  ) : (
                    <TextField
                      control={form.control}
                      name={name}
                      label={label}
                      maxLength={255}
                      placeholder={String(setting.default ?? '')}
                      className="pt-0"
                    />
                  )}
                </Tile>
              )
            })}
          </Group>
        ) : null}

        <FormActions align="between">
          <span className="text-[12.5px] text-[var(--muted)]">
            {dirty ? t('settings.unsaved') : t('settings.saved')}
          </span>
          <Button type="submit" loading={saving} disabled={!dirty}>
            {t('settings.save')}
          </Button>
        </FormActions>
      </Form>
    </FormSection>
  )
}

/** A titled grid of tiles: colours in one, the rest in another. */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 pt-2">
      <h4 className="text-[13px] font-medium text-[var(--text)]">{title}</h4>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  )
}

/** One setting on its own quiet panel, so each reads as a unit. */
function Tile({ wide = false, children }: { wide?: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-[12px] border-[0.5px] border-[var(--line)] bg-[var(--bg)] px-3.5 py-3',
        wide && 'sm:col-span-2 xl:col-span-3',
      )}
    >
      {children}
    </div>
  )
}

/**
 * One colour, with a way back to the design's own and, when the design says
 * what it sits on, a note if the two are hard to read together.
 */
function ColorSetting({
  form,
  setting,
  colors,
  locale,
}: {
  form: UseFormReturn<DesignSettingsFormValues>
  setting: DesignSetting
  colors: DesignSetting[]
  locale: Locale
}) {
  const { t } = useTranslation('appearance')
  const values = useWatch({ control: form.control, name: 'settings' })
  const name = labelOf(setting, locale)
  const value = String(values?.[setting.key] ?? '')
  const partner = colors.find((row) => row.key === setting.contrast_with)
  const partnerValue = partner ? String(values?.[partner.key] ?? '') : ''
  const clashes =
    partner !== undefined &&
    HEX.test(value) &&
    HEX.test(partnerValue) &&
    contrast(value, partnerValue) < MIN_CONTRAST

  return (
    <>
      <ColorField
        control={form.control}
        name={`settings.${setting.key}`}
        label={name}
        className="pt-0"
        action={
          setting.default !== null && !isDefault(setting, value) ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-5 shrink-0 gap-1 px-0 text-[12px]"
              aria-label={t('settings.resetLabel', { name })}
              onClick={() =>
                form.setValue(`settings.${setting.key}`, String(setting.default).toUpperCase(), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <IconRotate aria-hidden className="size-3" />
              {t('settings.reset')}
            </Button>
          ) : null
        }
      />
      {clashes ? (
        <HelperText tone="warning" className="pt-2">
          {t('settings.contrast', { partner: labelOf(partner, locale) })}
        </HelperText>
      ) : null}
    </>
  )
}
