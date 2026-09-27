import { z } from 'zod'
import { t } from '@/lib/i18n'
import { translatableTextSchema } from '@/shared/utils/string/menu-text'

/**
 * Mirrors `ColorsFontsController::payload()` in ../qayema.
 *
 * `colors` is whatever the design in use declares — a design with five colours
 * sends five — so nothing here names a colour. `fonts` has one entry per
 * writing system the menu uses: English and Spanish share `latin`.
 */
export const colorSettingSchema = z.object({
  key: z.string(),
  /** What the owner reads; null in a language the design has no label for. */
  label: translatableTextSchema,
  default: z.string().nullable(),
  /** What the menu is drawn with now: the owner's choice, else the default. */
  value: z.string().nullable(),
  /** Another colour's key this one is read against, for the contrast note. */
  contrast_with: z.string().nullable(),
})

export const fontScriptSchema = z.object({
  script: z.string(),
  /** The menu's languages written in this script, English first. */
  languages: z.array(z.string()).min(1),
  value: z.string(),
  default: z.string(),
  /** A dish name in this script, drawn in each font in the picker. */
  sample: z.string(),
  options: z.array(z.object({ family: z.string(), category: z.string() })),
})

export const colorsFontsSchema = z.object({
  design: z.object({ id: z.number().int(), name: translatableTextSchema }),
  colors: z.array(colorSettingSchema),
  fonts: z.array(fontScriptSchema),
})

export const colorsFontsResponseSchema = z.object({ data: colorsFontsSchema })

const HEX = /^#[0-9a-fA-F]{6}$/

/** The colours form: one entry per declared colour, keyed like the API. */
export const colorsFormSchema = z.object({
  colors: z.record(
    z.string(),
    z.string().regex(HEX, { error: () => t('colors-fonts:colors.invalid') }),
  ),
})

/** A change sent to the API. Null puts one back to its default. */
export type ColorsFontsChanges = {
  colors?: Record<string, string | null>
  fonts?: Record<string, string | null>
}

export type ColorSetting = z.infer<typeof colorSettingSchema>
export type FontScript = z.infer<typeof fontScriptSchema>
export type ColorsFonts = z.infer<typeof colorsFontsSchema>
export type ColorsFormValues = z.infer<typeof colorsFormSchema>
