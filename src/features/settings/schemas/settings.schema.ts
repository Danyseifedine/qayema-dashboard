import { z } from 'zod'
import { t } from '@/lib/i18n'
import { CURRENCIES } from '@/shared/constants/currencies'
import { COUNTRIES } from '@/shared/constants/countries'
import { MAIN_LANGUAGE, MENU_LANGUAGES } from '@/shared/constants/menu-languages'
import {
  menuTextField,
  menuTextSchema,
  requireEnglish,
  type MenuTextForm,
} from '@/shared/utils/string/menu-text'

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
  key: z.string().regex(UPLOAD_KEY, { error: () => t('settings:validation.uploadUnreadable') }),
  previewUrl: z.string(),
  name: z.string(),
  optimizedSize: z.string(),
  savedPercent: z.number(),
})

/** The form's value for "no second language". */
export const NO_SECOND_LANGUAGE = 'none'

/** The languages the form's current choice gives the menu, English first. */
export function formLanguages(secondLocale: string): string[] {
  return secondLocale === NO_SECOND_LANGUAGE ? [MAIN_LANGUAGE] : [MAIN_LANGUAGE, secondLocale]
}

/**
 * Mirrors ../qayema/app/Http/Resources/SettingsResource.php.
 *
 * `slug` and `default_locale` are read-only: the public address is fixed once
 * onboarding sets it, and the language the owner writes in is chosen there too.
 */
/** Monday first, as the API keys them. */
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export type Weekday = (typeof WEEKDAYS)[number]

/** A weekday's name in the dashboard's current language; call it at render. */
export function weekdayLabel(day: Weekday): string {
  return t(`settings:weekdays.${day}`)
}

/** One range, or null for a day the restaurant does not open. */
const dayRangeSchema = z.object({ open: z.string(), close: z.string() }).nullable()

export const openingHoursSchema = z.object({
  mon: dayRangeSchema,
  tue: dayRangeSchema,
  wed: dayRangeSchema,
  thu: dayRangeSchema,
  fri: dayRangeSchema,
  sat: dayRangeSchema,
  sun: dayRangeSchema,
})

export const settingsResponseSchema = z.object({
  data: z.object({
    /** What the menu is written in: English, then the second language if any. */
    languages: z.array(z.string()).min(1),
    second_locale: z.string().nullable(),
    /** What the menu opens in: one of `languages`. */
    default_locale: z.string(),
    name: menuTextSchema,
    description: menuTextSchema,
    slug: z.string(),
    google_maps_url: z.string().nullable(),
    phone: z.string().nullable(),
    country_code: z.string().nullable(),
    currency: z.string(),
    opening_hours: openingHoursSchema,
    timezone: z.string(),
    logo_url: z.url().nullable(),
    cover_url: z.url().nullable(),
  }),
})

export type Settings = z.infer<typeof settingsResponseSchema>['data']

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

const dayFormSchema = z
  .object({
    closed: z.boolean(),
    open: z.string(),
    close: z.string(),
  })
  .superRefine((day, ctx) => {
    if (day.closed) return

    for (const field of ['open', 'close'] as const) {
      if (!TIME.test(day[field])) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: t('settings:validation.timeFormat'),
        })
      }
    }
  })

export const settingsSchema = z
  .object({
    /** A code from MENU_LANGUAGES, or NO_SECOND_LANGUAGE for an English-only menu. */
    second_locale: z
      .string()
      .refine(
        (value) =>
          value === NO_SECOND_LANGUAGE || (value !== MAIN_LANGUAGE && value in MENU_LANGUAGES),
        { error: () => t('settings:validation.chooseLanguage') },
      ),
    default_locale: z.string(),

    /** One entry per menu language; English is required. */
    name: menuTextField(255, () => t('settings:fields.restaurantName')),
    description: menuTextField(2000, () => t('settings:fields.description')),

    google_maps_url: z
      .union([
        z.literal(''),
        z
          .url({ error: () => t('settings:validation.linkInvalid') })
          .max(2048, { error: () => t('settings:validation.linkTooLong') })
          .refine((value) => value.startsWith('http://') || value.startsWith('https://'), {
            error: () => t('settings:validation.linkInvalid'),
          }),
      ])
      .nullable(),

    country_code: z.string().refine((value) => COUNTRY_CODES.includes(value), {
      error: () => t('settings:validation.chooseCountry'),
    }),

    phone: z
      .string()
      .trim()
      .min(1, { error: () => t('settings:validation.phoneRequired') })
      .max(30, { error: () => t('settings:validation.phoneTooLong') })
      .regex(PHONE, { error: () => t('settings:validation.phoneInvalid') }),

    currency: z.string().refine((value) => CURRENCY_CODES.includes(value), {
      error: () => t('settings:validation.chooseCurrency'),
    }),

    /** Replaced through a temp upload; the logo can never be cleared. */
    logo: uploadedImageSchema.nullable(),
    cover_image: uploadedImageSchema.nullable(),
    /**
     * A day is either both times or neither. The form keeps an `closed` flag per
     * day so unticking it does not throw away what was typed.
     */
    opening_hours: z.object({
      mon: dayFormSchema,
      tue: dayFormSchema,
      wed: dayFormSchema,
      thu: dayFormSchema,
      fri: dayFormSchema,
      sat: dayFormSchema,
      sun: dayFormSchema,
    }),

    timezone: z.string().min(1, { error: () => t('settings:validation.chooseTimezone') }),

    /** Set when the owner removes the cover without picking a new one. */
    delete_cover_image: z.boolean(),
  })
  .superRefine((values, ctx) => {
    requireEnglish(values.name, 'name', t('settings:validation.nameRequiredInEnglish'), ctx)
    checkNames(values.name, ctx)

    if (!formLanguages(values.second_locale).includes(values.default_locale)) {
      ctx.addIssue({
        code: 'custom',
        path: ['default_locale'],
        message: t('settings:validation.defaultLocaleInvalid'),
      })
    }
  })

/** What the server checks on every written name: two characters, no control characters. */
function checkNames(name: MenuTextForm, ctx: z.RefinementCtx): void {
  for (const [code, text] of Object.entries(name)) {
    if (text === '') continue
    if (text.length < 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['name', code],
        message: t('settings:validation.nameTooShort'),
      })
    } else if (!NO_CONTROL_CHARS.test(text)) {
      ctx.addIssue({
        code: 'custom',
        path: ['name', code],
        message: t('settings:validation.nameInvalidChars'),
      })
    }
  }
}

export type SettingsFormValues = z.infer<typeof settingsSchema>
