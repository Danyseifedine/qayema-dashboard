import { z } from 'zod'
import { t } from '@/lib/i18n'
import { translatableTextSchema } from '../../menu/categories/schemas/category.schema'

/**
 * One knob a template lets its owner turn, as its `settings_schema` declares
 * it. Rows come from the admin panel, so a half-filled one is tolerated here
 * and simply skipped by whoever reads it.
 */
export const templateSettingSchema = z.object({
  key: z.string().nullish(),
  type: z.string().nullish(),
  default: z.unknown(),
})

/** Mirrors ../qayema/app/Http/Resources/TemplateResource.php. */
export const templateSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: translatableTextSchema,
  description: translatableTextSchema,
  thumbnail_url: z.url().nullable(),
  settings_schema: z.array(templateSettingSchema).nullable(),
})

/** Saved values over the template's defaults: what the menu is drawn with. */
export const templateSettingsSchema = z.record(z.string(), z.unknown())

export const templateListSchema = z.object({
  data: z.array(templateSchema),
  meta: z.object({
    /** The restaurant's active template, null until one is chosen. */
    current: z.number().int().nullable(),
    settings: templateSettingsSchema,
  }),
})

export const templateSettingsResponseSchema = z.object({
  data: z.object({ settings: templateSettingsSchema }),
})

const HEX = /^#[0-9a-fA-F]{6}$/

/** The menu colour form. The server checks the same six-digit hex. */
export const menuColourSchema = z.object({
  primary_color: z.string().regex(HEX, { error: () => t('templates:colour.invalid') }),
})

export type Template = z.infer<typeof templateSchema>
export type TemplateList = z.infer<typeof templateListSchema>
export type TemplateSettings = z.infer<typeof templateSettingsSchema>
export type MenuColourValues = z.infer<typeof menuColourSchema>
