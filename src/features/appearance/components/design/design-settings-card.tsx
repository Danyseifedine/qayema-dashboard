import { zodResolver } from '@hookform/resolvers/zod'
import { IconAdjustmentsHorizontal, IconCheck, IconPalette, IconRotate } from '@tabler/icons-react'
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
  SwitchField,
  TextField,
} from '@/shared/components/forms'
import { Button, HelperText, SectionCard } from '@/shared/components/ui'
import type { Locale } from '@/shared/constants/locales'
import { MIN_CONTRAST, contrast } from '@/shared/utils/color/contrast'
import { cn } from '@/shared/utils/dom/cn'
import { nameOr, type TranslatableValue } from '@/shared/utils/string/translated'

const HEX = /^#[0-9a-fA-F]{6}$/

/** The photos behind each card's title. */
const PICTURES = {
  colors: '/assets/images/dashboard/preference/colors.webp',
  options: '/assets/images/dashboard/preference/options.webp',
} as const

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
  return nameOr(setting.label as TranslatableValue, locale, humanise(setting.key))
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
      <SectionCard
        icon={<IconPalette className="size-[18px]" stroke={1.8} />}
        title={designName}
        description={t('settings.none', { design: designName })}
      />
    )
  }

  return (
    <Form onSubmit={onSubmit} className="gap-4">
      {colors.length > 0 ? (
        <SectionCard
          icon={<IconPalette className="size-[18px]" stroke={1.8} />}
          picture={PICTURES.colors}
          title={t('settings.colorsTitle')}
          description={t('settings.colorsDescription', { design: designName })}
        >
          <Tiles pairs>
            {colors.map((setting, at) => (
              <Tile
                key={setting.key}
                // An odd one out at the end takes the row, not half of it.
                span={colors.length % 2 === 1 && at === colors.length - 1}
              >
                <ColorSetting form={form} setting={setting} colors={colors} locale={locale} />
              </Tile>
            ))}
          </Tiles>
        </SectionCard>
      ) : null}

      {others.length > 0 ? (
        <SectionCard
          icon={<IconAdjustmentsHorizontal className="size-[18px]" stroke={1.8} />}
          picture={PICTURES.options}
          title={t('settings.optionsTitle')}
          description={t('settings.optionsDescription')}
        >
          <Tiles>
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
          </Tiles>
        </SectionCard>
      ) : null}

      {/* Quiet while nothing changed; a gold bar with Save once something did. */}
      {dirty || saving ? (
        <FormActions
          align="between"
          className="rounded-tile border-[0.5px] border-accent-border bg-accent-wash p-2.5 ps-3.5"
        >
          <span className="text-[13px] font-medium text-accent">{t('settings.unsaved')}</span>
          <Button type="submit" size="sm" loading={saving}>
            {t('settings.save')}
          </Button>
        </FormActions>
      ) : (
        <p className="-mt-1 flex items-center justify-end gap-1.5 text-[12px] text-[var(--muted)]">
          <IconCheck aria-hidden className="size-3.5" />
          {t('settings.saved')}
        </p>
      )}
    </Form>
  )
}

/**
 * The tiles of a card, in one column until two fit: colours pair up as soon
 * as half the card holds a swatch and a name (most phones), the rest from a
 * tablet up; three on a wide screen. Measured on the card, not the screen.
 */
function Tiles({ pairs = false, children }: { pairs?: boolean; children: ReactNode }) {
  return (
    <div className="@container">
      <div
        className={cn(
          'grid grid-cols-1 gap-2.5 sm:gap-3',
          // On the card's own width, so a wide card takes three.
          pairs
            ? '@min-[20rem]:grid-cols-2 @min-[48rem]:grid-cols-3'
            : '@min-[30rem]:grid-cols-2 @min-[48rem]:grid-cols-3',
        )}
      >
        {children}
      </div>
    </div>
  )
}

/** One setting on its own dark panel inside the card, so each reads as a unit. */
function Tile({
  wide = false,
  span = false,
  children,
}: {
  /** The whole row, always: a choice or a line of text. */
  wide?: boolean
  /** The whole row while tiles go two a row: the odd colour out. */
  span?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-tile p-3',
        // Frosted: the card's photo shows through it, blurred (as a font's row).
        'frost-tile',
        wide && 'col-span-full',
        span && '@min-[20rem]:col-span-2 @min-[48rem]:col-span-1',
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
        layout="tile"
        className="pt-0"
        action={
          setting.default !== null && !isDefault(setting, value) ? (
            // An icon only: half a phone's width leaves no room for a word
            // beside the colour's name.
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-accent"
              aria-label={t('settings.resetLabel', { name })}
              title={t('settings.reset')}
              onClick={() =>
                form.setValue(`settings.${setting.key}`, String(setting.default).toUpperCase(), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <IconRotate aria-hidden className="size-3.5" />
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
