import { z } from 'zod'
import { MENU_TEXT_LIMITS } from '@/shared/constants/menu-text-limits'
import { imageFieldSchema } from '@/features/uploads'
import { shiftProblem } from '@/shared/utils/format/clock'
import { MAX_SHIFTS } from '@/features/restaurant/utils/time-options'
import { t } from '@/lib/i18n'
import { CURRENCIES } from '@/shared/constants/currencies'
import { COUNTRIES } from '@/shared/constants/countries'
import {
  menuTextField,
  menuTextSchema,
  requireMainLanguage,
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

/**
 * A day's shifts, earliest first (lunch, then dinner; MAX_SHIFTS at most),
 * or null for a day the restaurant does not open.
 */
const dayShiftsSchema = z.array(z.object({ open: z.string(), close: z.string() })).nullable()

const openingHoursSchema = z.object({
  mon: dayShiftsSchema,
  tue: dayShiftsSchema,
  wed: dayShiftsSchema,
  thu: dayShiftsSchema,
  fri: dayShiftsSchema,
  sat: dayShiftsSchema,
  sun: dayShiftsSchema,
})

export const restaurantResponseSchema = z.object({
  data: z.object({
    /** What the menu is written in: the main language, then the second if any. */
    languages: z.array(z.string()).min(1),
    name: menuTextSchema,
    description: menuTextSchema,
    slug: z.string(),
    google_maps_url: z.string().nullable(),
    phone: z.string().nullable(),
    country_code: z.string().nullable(),
    currency: z.string(),
    /** One more currency some dishes may be priced in; null for none. */
    second_currency: z.string().nullable().default(null),
    /**
     * What one of the second currency is worth in the main one, as a decimal
     * string (main LBP, second USD: "89000"); null without a second currency.
     */
    exchange_rate: z.string().nullable().default(null),
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
    shifts: z
      .array(z.object({ open: z.string(), close: z.string() }))
      .min(1)
      .max(MAX_SHIFTS),
  })
  .superRefine((day, ctx) => {
    if (day.closed) return

    let picked = true
    day.shifts.forEach((shift, index) => {
      for (const field of ['open', 'close'] as const) {
        if (!TIME.test(shift[field])) {
          picked = false
          ctx.addIssue({
            code: 'custom',
            path: ['shifts', index, field],
            message: t('restaurant:validation.timeFormat'),
          })
        }
      }
    })
    if (!picked) return

    // Under the shift at fault, as the server checks (OpeningHours::problemWith()).
    const problem = shiftProblem(day.shifts)
    if (problem) {
      ctx.addIssue({
        code: 'custom',
        path: ['shifts', problem.index, 'open'],
        message: t(
          problem.reason === 'overlap'
            ? 'restaurant:validation.shiftsOverlap'
            : 'restaurant:validation.pastMidnightNotLast',
        ),
      })
    }
  })

export const restaurantFormSchema = z
  .object({
    /** One entry per menu language; the main one is required. */
    name: menuTextField(MENU_TEXT_LIMITS.restaurantName, () =>
      t('restaurant:fields.restaurantName'),
    ),
    description: menuTextField(MENU_TEXT_LIMITS.restaurantDescription, () =>
      t('restaurant:fields.description'),
    ),

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

    /** Empty (or null, once cleared) for none. */
    second_currency: z.string().nullable(),
    /**
     * The exchange rate as the owner types it: `rate_one` says which
     * currency is the 1 ("1 USD = 89,000 LBP" or "1 LBP = ... USD").
     */
    rate_one: z.enum(['second', 'main']),
    rate: z.number().nullable(),

    /** Replaced through a temp upload; the logo can never be cleared. */
    logo: imageFieldSchema,
    cover_image: imageFieldSchema,
    /**
     * A day is its shifts, or closed. The form keeps a `closed` flag per day
     * so unticking it does not throw away what was picked.
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
      requireMainLanguage(
        values.name,
        'name',
        (language) => t('restaurant:validation.nameRequired', { language }),
        ctx,
      )
      checkNames(values.name, ctx)
      checkSecondCurrency(values, ctx)
    },
    // Also when another field is wrong, so one submit shows every problem.
    { when: () => true },
  )

/** A second currency is one on the list, not the main one, and comes with a rate above 0. */
function checkSecondCurrency(
  values: { currency: string; second_currency: string | null; rate: number | null },
  ctx: z.RefinementCtx,
): void {
  if (!values.second_currency) return
  if (
    values.second_currency === values.currency ||
    !CURRENCY_CODES.includes(values.second_currency)
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['second_currency'],
      message: t('restaurant:validation.secondCurrencyInvalid'),
    })
  }
  if (values.rate === null) {
    ctx.addIssue({
      code: 'custom',
      path: ['rate'],
      message: t('restaurant:validation.rateRequired'),
    })
  } else if (values.rate <= 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['rate'],
      message: t('restaurant:validation.ratePositive'),
    })
  }
}

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
