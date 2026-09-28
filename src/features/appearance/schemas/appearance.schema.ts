import { z } from 'zod'
import { t } from '@/lib/i18n'
import { translatableTextSchema } from '@/shared/utils/string/menu-text'

/**
 * Mirrors `AppearanceController::payload()` in ../qayema.
 *
 * `settings` is whatever the design in use declares (a design with five
 * colours and an on/off switch sends six), so nothing here names a setting.
 * `fonts` has one entry per writing system the menu uses: English and
 * Spanish share `latin`.
 */
const settingTypeSchema = z.enum(['color', 'boolean', 'select', 'text'])

const designSettingSchema = z.object({
  key: z.string(),
  type: settingTypeSchema,
  /** What the owner reads; null in a language the design has no label for. */
  label: translatableTextSchema,
  default: z.union([z.string(), z.boolean()]).nullable(),
  /** What the menu is drawn with now: the owner's choice, else the default. */
  value: z.union([z.string(), z.boolean()]).nullable(),
  /** Another colour's key this one is read against, for the contrast note. */
  contrast_with: z.string().nullable(),
  /** A choice's options; empty for every other type. */
  options: z.array(z.string()),
})

const fontScriptSchema = z.object({
  script: z.string(),
  /** The menu's languages written in this script, English first. */
  languages: z.array(z.string()).min(1),
  value: z.string(),
  default: z.string(),
  /** A dish name in this script, drawn in each font in the picker. */
  sample: z.string(),
  options: z.array(z.object({ family: z.string(), category: z.string() })),
})

const appearanceSchema = z.object({
  design: z.object({ name: translatableTextSchema }),
  settings: z.array(designSettingSchema),
  fonts: z.array(fontScriptSchema),
})

export const appearanceResponseSchema = z.object({ data: appearanceSchema })

const HEX = /^#[0-9a-fA-F]{6}$/

/** A value as the form holds it, checked by the setting's own type. */
export function settingValueSchema(setting: DesignSetting) {
  switch (setting.type) {
    case 'color':
      return z.string().regex(HEX, { error: () => t('appearance:settings.invalidColor') })
    case 'boolean':
      return z.boolean()
    case 'select':
      return z.string().refine((value) => setting.options.includes(value))
    case 'text':
      return z.string().max(255, { error: () => t('appearance:settings.tooLong') })
  }
}

/** The design settings form: one entry per declared setting, keyed like the API. */
export function designSettingsFormSchema(settings: DesignSetting[]) {
  return z.object({
    settings: z.object(
      Object.fromEntries(settings.map((setting) => [setting.key, settingValueSchema(setting)])),
    ),
  })
}

export type DesignSettingsFormValues = { settings: Record<string, string | boolean> }

/** A change sent to the API. Null puts one back to its default. */
export type AppearanceChanges = {
  settings?: Record<string, string | boolean | null>
  fonts?: Record<string, string | null>
}

export type DesignSetting = z.infer<typeof designSettingSchema>
export type FontScript = z.infer<typeof fontScriptSchema>
export type Appearance = z.infer<typeof appearanceSchema>
