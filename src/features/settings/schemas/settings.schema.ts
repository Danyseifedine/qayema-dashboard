import { z } from 'zod'
import { CURRENCIES } from '@/shared/constants/currencies'
import { COUNTRIES } from '@/shared/constants/countries'

/**
 * Mirrors ../qayema/app/Http/Requests/UpdateSettingsRequest.php.
 *
 * The server is still the authority; this exists so an owner sees the problem
 * before a round trip, and so the messages read the same on both sides.
 */

/** Rejects interior control characters, as the server's `/u` regex does. */
// Rejecting control characters is the intent here, mirroring the
// server's `/u` regex in UpdateSettingsRequest.
// oxlint-disable-next-line no-control-regex
const NO_CONTROL_CHARS = /^[^\u0000-\u001F\u007F]+$/

/** `[0-9+() .-]{6,30}` with at least six digits. */
const PHONE = /^(?=(?:\D*\d){6,})[0-9+() .-]{6,30}$/

/** A temp-upload key is a UUID. */
const UPLOAD_KEY = /^[a-f0-9-]{36}$/

const CURRENCY_CODES = CURRENCIES.map((currency) => currency.code)
const COUNTRY_CODES = COUNTRIES.map((country) => country.code)

export const uploadedImageSchema = z.object({
  key: z.string().regex(UPLOAD_KEY, 'That upload could not be read. Please try again.'),
  previewUrl: z.string(),
  name: z.string(),
  size: z.number(),
})

export const settingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'The restaurant name must be at least 2 characters.')
    .max(255, 'The restaurant name may not be longer than 255 characters.')
    .regex(NO_CONTROL_CHARS, 'The restaurant name contains characters that are not allowed.'),

  description: z
    .string()
    .trim()
    .max(2000, 'The description may not be longer than 2000 characters.')
    .or(z.literal(''))
    .nullable(),

  address: z
    .string()
    .trim()
    .max(500, 'The address may not be longer than 500 characters.')
    .or(z.literal(''))
    .nullable(),

  google_maps_url: z
    .union([
      z.literal(''),
      z
        .url('Enter a valid link, starting with https://')
        .max(2048, 'That link is too long.')
        .refine(
          (value) => value.startsWith('http://') || value.startsWith('https://'),
          'Enter a valid link, starting with https://',
        ),
    ])
    .nullable(),

  country_code: z
    .string()
    .refine((value) => COUNTRY_CODES.includes(value), 'Please choose a country from the list.'),

  phone: z
    .string()
    .trim()
    .min(1, 'A phone number is required.')
    .max(30, 'That phone number is too long.')
    .regex(PHONE, 'Please enter a valid phone number using digits only.'),

  currency: z
    .string()
    .refine((value) => CURRENCY_CODES.includes(value), 'Please choose a currency from the list.'),

  /** Replaced through a temp upload; the logo can never be cleared. */
  logo: uploadedImageSchema.nullable(),
  cover_image: uploadedImageSchema.nullable(),
})

export type SettingsFormValues = z.infer<typeof settingsSchema>
