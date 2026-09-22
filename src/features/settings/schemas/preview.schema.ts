import { z } from 'zod'
import { COUNTRIES } from '@/shared/constants/countries'
import { CURRENCIES } from '@/shared/constants/currencies'
import { uploadedImageSchema } from './settings.schema'

/**
 * Schema behind the form preview. It covers every control the library ships,
 * including the translatable and money fields that the settings payload itself
 * does not carry, so each one is validated by something real rather than by a
 * placeholder.
 */

// Rejecting control characters is the intent here, mirroring the
// server's `/u` regex in UpdateSettingsRequest.
// oxlint-disable-next-line no-control-regex
const NO_CONTROL_CHARS = /^[^\u0000-\u001F\u007F]+$/
const PHONE = /^(?=(?:\D*\d){6,})[0-9+() .-]{6,30}$/
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

const CURRENCY_CODES = CURRENCIES.map((currency) => currency.code)
const COUNTRY_CODES = COUNTRIES.map((country) => country.code)

/** A `{en, ar}` pair where English is required and Arabic is optional. */
const translatableRequired = (max: number) =>
  z.object({
    en: z
      .string()
      .trim()
      .min(2, 'This must be at least 2 characters.')
      .max(max, `This may not be longer than ${max} characters.`)
      .regex(NO_CONTROL_CHARS, 'This contains characters that are not allowed.'),
    ar: z.string().trim().max(max, `This may not be longer than ${max} characters.`),
  })

const translatableOptional = (max: number) =>
  z.object({
    en: z.string().trim().max(max, `This may not be longer than ${max} characters.`),
    ar: z.string().trim().max(max, `This may not be longer than ${max} characters.`),
  })

export const previewFormSchema = z
  .object({
    name: translatableRequired(255),
    description: translatableOptional(2000),

    tagline: z.string().trim().max(60, 'Keep the tagline under 60 characters.'),

    address: z.string().trim().max(500, 'The address may not be longer than 500 characters.'),

    google_maps_url: z.union([
      z.literal(''),
      z.url('Enter a valid link, starting with https://').max(2048, 'That link is too long.'),
    ]),

    country_code: z
      .string()
      .refine((value) => COUNTRY_CODES.includes(value), 'Please choose a country from the list.'),

    phone: z
      .string()
      .trim()
      .min(1, 'A phone number is required.')
      .regex(PHONE, 'Please enter a valid phone number using digits only.'),

    currency: z
      .string()
      .refine((value) => CURRENCY_CODES.includes(value), 'Please choose a currency from the list.'),

    price: z
      .number('Enter a price.')
      .min(0, 'A price cannot be negative.')
      .max(1_000_000, 'That price is too high.')
      .nullable(),

    accent_color: z.string().regex(HEX_COLOR, 'Enter a six-digit hex colour, such as #F8D38D.'),

    /** Which language the public menu opens in. */
    default_locale: z.enum(['en', 'ar']),

    is_published: z.boolean(),

    accepts_terms: z.boolean(),

    logo: uploadedImageSchema.nullable(),
    cover_image: uploadedImageSchema.nullable(),
    /** Internal note, never shown to guests. */
    internal_note: z.string().trim().max(500, 'Keep the note under 500 characters.'),
  })
  .superRefine((values, ctx) => {
    // Checked at the object level so each field's input and output types stay
    // identical, which is what lets `useForm<PreviewFormValues>` infer cleanly.
    if (!values.accepts_terms) {
      ctx.addIssue({
        code: 'custom',
        path: ['accepts_terms'],
        message: 'Please confirm these details before saving.',
      })
    }

    if (values.logo === null) {
      ctx.addIssue({ code: 'custom', path: ['logo'], message: 'A logo is required.' })
    }
  })

export type PreviewFormValues = z.infer<typeof previewFormSchema>
