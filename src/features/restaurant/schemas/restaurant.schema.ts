import { z } from 'zod'
import { imageFieldSchema } from '@/features/uploads'
import { t } from '@/lib/i18n'
import { CURRENCIES } from '@/shared/constants/currencies'
import { COUNTRIES } from '@/shared/constants/countries'
import {
  menuTextField,
  menuTextSchema,
  requireEnglish,
  type MenuTextForm,
} from '@/shared/utils/string/menu-text'

/**
 * Mirrors ../qayema/app/Http/Requests/UpdateRestaurantRequest.php.
 *
 * The server is still the authority; this exists so an owner sees the problem
 * before a round trip, and so the messages read the same on both sides.
 */

/** Rejects interior control characters, as the server's `/u` regex does. */
// Rejecting control characters is the intent here, mirroring the
// server's `/u` regex in UpdateRestaurantRequest.
// oxlint-disable-next-line no-control-regex
const NO_CONTROL_CHARS = /^[^\u0000-\u001F\u007F]+$/

/** `[0-9+() .-]{6,30}` with at least six digits. */
const PHONE = /^(?=(?:\D*\d){6,})[0-9+() .-]{6,30}$/

const CURRENCY_CODES = CURRENCIES.map((currency) => currency.code)
const COUNTRY_CODES = COUNTRIES.map((country) => country.code)

/**
 * Mirrors ../qayema/app/Http/Resources/SettingsResource.php.
 *
 * `slug` is not part of the page's save: a new link goes through
 * `changeSlug` (the Menu link section), which keeps the old one forwarding.
 * The menu's languages are set on the Features page; text here follows them.
 */
/** Monday first, as the API keys them. */
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export type Weekday = (typeof WEEKDAYS)[number]

/** A weekday's name in the dashboard's current language; call it at render. */
export function weekdayLabel(day: Weekday): string {
  return t(`restaurant:weekdays.${day}`)
}

/** One range, or null for a day the restaurant does not open. */
const dayRangeSchema = z.object({ open: z.string(), close: z.string() }).nullable()

const openingHoursSchema = z.object({
  mon: dayRangeSchema,
  tue: dayRangeSchema,
  wed: dayRangeSchema,
  thu: dayRangeSchema,
  fri: dayRangeSchema,
  sat: dayRangeSchema,
  sun: dayRangeSchema,
})

export const restaurantResponseSchema = z.object({
  data: z.object({
    /** What the menu is written in: English, then the second language if any. */
    languages: z.array(z.string()).min(1),
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

export type Restaurant = z.infer<typeof restaurantResponseSchema>['data']

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
          message: t('restaurant:validation.timeFormat'),
        })
      }
    }
  })

export const restaurantFormSchema = z
  .object({
    /** One entry per menu language; English is required. */
    name: menuTextField(255, () => t('restaurant:fields.restaurantName')),
    description: menuTextField(2000, () => t('restaurant:fields.description')),

    google_maps_url: z
      .union([
        z.literal(''),
        z
          .url({ error: () => t('restaurant:validation.linkInvalid') })
          .max(2048, { error: () => t('restaurant:validation.linkTooLong') })
          .refine((value) => value.startsWith('http://') || value.startsWith('https://'), {
            error: () => t('restaurant:validation.linkInvalid'),
          }),
      ])
      .nullable(),

    country_code: z.string().refine((value) => COUNTRY_CODES.includes(value), {
      error: () => t('restaurant:validation.chooseCountry'),
    }),

    phone: z
      .string()
      .trim()
      .min(1, { error: () => t('restaurant:validation.phoneRequired') })
      .max(30, { error: () => t('restaurant:validation.phoneTooLong') })
      .regex(PHONE, { error: () => t('restaurant:validation.phoneInvalid') }),

    currency: z.string().refine((value) => CURRENCY_CODES.includes(value), {
      error: () => t('restaurant:validation.chooseCurrency'),
    }),

    /** Replaced through a temp upload; the logo can never be cleared. */
    logo: imageFieldSchema,
    cover_image: imageFieldSchema,
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

    timezone: z.string().min(1, { error: () => t('restaurant:validation.chooseTimezone') }),
  })
  .superRefine(
    (values, ctx) => {
      requireEnglish(values.name, 'name', t('restaurant:validation.nameRequiredInEnglish'), ctx)
      checkNames(values.name, ctx)
    },
    // Also when another field is wrong, so one submit shows every problem.
    { when: () => true },
  )

/** What the server checks on every written name: two characters, no control characters. */
function checkNames(name: MenuTextForm, ctx: z.RefinementCtx): void {
  for (const [code, text] of Object.entries(name)) {
    if (text === '') continue
    if (text.length < 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['name', code],
        message: t('restaurant:validation.nameTooShort'),
      })
    } else if (!NO_CONTROL_CHARS.test(text)) {
      ctx.addIssue({
        code: 'custom',
        path: ['name', code],
        message: t('restaurant:validation.nameInvalidChars'),
      })
    }
  }
}

export type RestaurantFormValues = z.infer<typeof restaurantFormSchema>
