import { z } from 'zod'
import { t } from '@/lib/i18n'
import { translatableTextSchema } from '@/shared/utils/string/menu-text'

/**
 * One knob a template lets its owner turn, as its `settings_schema` declares
 * it. Rows come from the admin panel, so a half-filled one is tolerated here
 * and simply skipped by whoever reads it.
 */
export const designSettingSchema = z.object({
  key: z.string().nullish(),
  type: z.string().nullish(),
  default: z.unknown(),
})

/** Mirrors ../qayema/app/Http/Resources/TemplateResource.php. */
export const designSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: translatableTextSchema,
  description: translatableTextSchema,
  thumbnail_url: z.url().nullable(),
  settings_schema: z.array(designSettingSchema).nullable(),
})

/** Saved values over the template's defaults: what the menu is drawn with. */
export const designSettingsSchema = z.record(z.string(), z.unknown())

export const designListSchema = z.object({
  data: z.array(designSchema),
  meta: z.object({
    /** The restaurant's active template, null until one is chosen. */
    current: z.number().int().nullable(),
    settings: designSettingsSchema,
  }),
})

export const designSettingsResponseSchema = z.object({
  data: z.object({ settings: designSettingsSchema }),
})

const HEX = /^#[0-9a-fA-F]{6}$/

/** The menu colour form. The server checks the same six-digit hex. */
export const menuColorSchema = z.object({
  primary_color: z.string().regex(HEX, { error: () => t('design:color.invalid') }),
})

export type Design = z.infer<typeof designSchema>
export type DesignList = z.infer<typeof designListSchema>
export type DesignSettings = z.infer<typeof designSettingsSchema>
export type MenuColorValues = z.infer<typeof menuColorSchema>
