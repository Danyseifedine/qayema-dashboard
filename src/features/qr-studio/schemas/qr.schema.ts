import { z } from 'zod'

/**
 * Mirrors ../qayema/app/Http/Controllers/Api/QrController.php (the payload)
 * and ../qayema/app/Http/Requests/QrSettingsRequest.php (the rules). The
 * allowed shapes are the names `qr-code-styling` draws, as listed in
 * App\Services\Global\QrStyle.
 */

export const DOT_STYLES = [
  'square',
  'dots',
  'rounded',
  'extra-rounded',
  'classy',
  'classy-rounded',
] as const
export const CORNER_STYLES = ['square', 'extra-rounded', 'dot'] as const
export const EYE_STYLES = ['square', 'dot'] as const
export const GRADIENT_TYPES = ['linear', 'radial'] as const
export const LOGO_SIZES = ['small', 'medium', 'large'] as const
export const CARD_THEMES = ['light', 'dark', 'brand'] as const

export type DotStyle = (typeof DOT_STYLES)[number]
export type CornerStyle = (typeof CORNER_STYLES)[number]
export type EyeStyle = (typeof EYE_STYLES)[number]
export type GradientType = (typeof GRADIENT_TYPES)[number]
export type LogoSize = (typeof LOGO_SIZES)[number]
export type CardTheme = (typeof CARD_THEMES)[number]

const HEX = /^#[0-9a-fA-F]{6}$/
const colour = z.string().regex(HEX, 'Use a colour like #1F6FEB.')

export const qrDesignSchema = z.object({
  dot_style: z.enum(DOT_STYLES),
  dot_color: colour,
  /** A second colour turns the dots into a gradient; null keeps them plain. */
  dot_gradient: colour.nullable(),
  gradient_type: z.enum(GRADIENT_TYPES),
  corner_style: z.enum(CORNER_STYLES),
  corner_color: colour,
  eye_style: z.enum(EYE_STYLES),
  eye_color: colour,
  background: colour,
  logo: z.boolean(),
  logo_size: z.enum(LOGO_SIZES),
  card_theme: z.enum(CARD_THEMES),
  title: z.string().nullable(),
  subtitle: z.string().nullable(),
  cta: z.string().nullable(),
  show_url: z.boolean(),
})

export type QrDesign = z.infer<typeof qrDesignSchema>

export const qrStatsSchema = z.object({
  today: z.number().int(),
  week: z.number().int(),
  month: z.number().int(),
  total: z.number().int(),
})

export type QrStats = z.infer<typeof qrStatsSchema>

export const qrSchema = z.object({
  unlocked: z.boolean(),
  /** What the code encodes. Never changes with the design. */
  url: z.string(),
  display_url: z.string(),
  /** The printable table card, when the studio is open. */
  card_url: z.string().nullable(),
  /** Inlined so it can be drawn into a PNG without the CDN sending CORS. */
  logo_data_url: z.string().nullable(),
  /** The menu's main colour — what a "brand" card is painted with. */
  brand_color: z.string(),
  settings: qrDesignSchema,
  /** The simple QR — what "Reset to simple" returns to. */
  defaults: qrDesignSchema,
  stats: qrStatsSchema.nullable(),
})

export type Qr = z.infer<typeof qrSchema>

export const qrResponseSchema = z.object({ data: qrSchema })

/**
 * The editor's values. The card's text fields are plain strings here, empty
 * rather than null, because that is what an input holds; they go back to null
 * on the way out.
 */
export const qrFormSchema = qrDesignSchema.extend({
  title: z.string().trim().max(60, 'Keep the title under 60 characters.'),
  subtitle: z.string().trim().max(80, 'Keep the subtitle under 80 characters.'),
  cta: z.string().trim().max(60, 'Keep this under 60 characters.'),
})

export type QrFormValues = z.infer<typeof qrFormSchema>

export function toFormValues(design: QrDesign): QrFormValues {
  return {
    ...design,
    title: design.title ?? '',
    subtitle: design.subtitle ?? '',
    cta: design.cta ?? '',
  }
}

export function toDesign(values: QrFormValues): QrDesign {
  const blankToNull = (value: string) => (value.trim() === '' ? null : value.trim())

  return {
    ...values,
    title: blankToNull(values.title),
    subtitle: blankToNull(values.subtitle),
    cta: blankToNull(values.cta),
  }
}
