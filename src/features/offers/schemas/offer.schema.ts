import { z } from 'zod'
import { t } from '@/lib/i18n'
import { MENU_TEXT_LIMITS } from '@/shared/constants/menu-text-limits'
import { REMOVED_IMAGE, imageFieldSchema } from '@/features/uploads'
import { shiftProblem } from '@/shared/utils/format/clock'
import {
  menuTextField,
  menuTextSchema,
  requireMainLanguage,
  toMenuTextForm,
} from '@/shared/utils/string/menu-text'
import { discountNumber } from '@/features/offers/utils/discount'

/** Where an offer shows, as `App\Enums\OfferPlacement` in ../qayema. */
export const PLACEMENTS = ['banner', 'popup', 'ad'] as const
export type Placement = (typeof PLACEMENTS)[number]

/**
 * The two that appear over the menu, one or both: an offer that is both
 * shows its pop-up first, and its ad once the pop-up is closed.
 */
export const OVERLAYS: readonly Placement[] = ['popup', 'ad']

/**
 * The shape a banner or a pop-up takes on the menu (the picture is cut to
 * it). A short ad is always a wide rectangle, so it has no choice.
 */
export const BANNER_SHAPES = ['rectangle', 'square'] as const
export const POPUP_SHAPES = ['square', 'tall'] as const
type BannerShape = (typeof BANNER_SHAPES)[number]
type PopupShape = (typeof POPUP_SHAPES)[number]

export const ACTIONS = ['none', 'dishes', 'link'] as const
/**
 * What the offer gives guests: nothing to order (its picture and words,
 * a tap doing nothing or opening a link), a discount on the owner's
 * dishes, or a deal dish of its own, on the menu only while it is live.
 */
export const GIVES = ['nothing', 'discount', 'deal'] as const
export type Gives = (typeof GIVES)[number]
export const SHOW_AGAIN = ['every_visit', 'daily', 'once'] as const
/**
 * What the offer takes off its dishes: nothing, a percent or an amount off
 * each (the size and other choices included, add-ons not), or `second`: any
 * two dishes on the offer make a pair and the second one the guest adds is
 * a percent off (100 is free).
 */
export const DISCOUNTS = ['none', 'percent', 'amount', 'second'] as const

/** A `second` discount of 100% gives the second one free. */
export const FREE = 100
export const REPEATS = ['always', 'weekly', 'monthly'] as const

/** Monday first, as the server stores them (OfferSchedule::DAYS). */
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type Weekday = (typeof WEEKDAYS)[number]

/** Times of day a schedule may have, as OfferSchedule::MAX_WINDOWS. */
export const MAX_WINDOWS = 3

/** How long an ad stays, and how long a pop-up or an ad waits, in seconds. */
export const AD_SECONDS = [3, 5, 8, 10, 15] as const
export const DELAYS = [0, 2, 5, 10] as const

/**
 * The usual choices of seconds, and in its place among them a saved value
 * that is not one of them (an offer made in the admin), so it shows picked.
 */
export function withSaved(choices: readonly number[], saved: number): number[] {
  return choices.includes(saved) ? [...choices] : [...choices, saved].sort((a, b) => a - b)
}

const windowSchema = z.object({ from: z.string(), to: z.string() })
type TimeWindow = z.infer<typeof windowSchema>

/**
 * The dish an offer made of its own (OfferResource `deal`): on the menu,
 * and orderable, only while the offer is live. Edited from the offer; the
 * Dishes page can change or delete it too.
 */
const dealSchema = z.object({
  id: z.number().int(),
  name: menuTextSchema,
  ingredients: menuTextSchema.nullable(),
  /** "25.00". */
  price: z.string(),
  /** The second currency when priced in it, as a dish's; null for the main one. */
  currency: z.string().nullable(),
  category_id: z.number().int().nullable(),
  image_url: z.url().nullable(),
  thumb_url: z.url().nullable(),
  is_available: z.boolean(),
})

export type Deal = z.infer<typeof dealSchema>

/** Mirrors ../qayema/app/Http/Resources/OfferResource.php. */
const offerSchema = z.object({
  id: z.number().int(),
  title: menuTextSchema,
  description: menuTextSchema,
  /** False: a picture alone, its words drawn into it. */
  show_text: z.boolean().default(true),
  image_url: z.url().nullable(),
  placements: z.array(z.enum(PLACEMENTS)),
  banner_shape: z.enum(BANNER_SHAPES).default('rectangle'),
  popup_shape: z.enum(POPUP_SHAPES).default('square'),
  action: z.enum(ACTIONS),
  action_url: z.string().nullable(),
  show_again: z.enum(SHOW_AGAIN),
  delay_seconds: z.number().int(),
  /** The ad's wait: after the pop-up closes, or the menu opens for an ad alone. */
  ad_delay_seconds: z.number().int().default(2),
  ad_seconds: z.number().int(),
  discount_type: z.enum(DISCOUNTS),
  discount_value: z.string().nullable(),
  dish_ids: z.array(z.number().int()),
  /** The restaurant's local time, "2026-11-01T18:00", as the editor sends it. */
  starts_at: z.string().nullable(),
  ends_at: z.string().nullable(),
  repeat: z.enum(REPEATS),
  weekdays: z.array(z.enum(WEEKDAYS)),
  month_days: z.array(z.number().int()),
  time_windows: z.array(windowSchema).nullable(),
  /** Shown all the time; the deal works only on its days and hours. */
  shows_outside_hours: z.boolean().default(false),
  is_active: z.boolean(),
  /** `off`: switched on but kept off the menu by what the package lacks (`kept_off`). */
  status: z.enum(['live', 'scheduled', 'ended', 'paused', 'off']),
  /** Why the package keeps it off the menu (OfferRules::keepsOff()), or null. */
  kept_off: z.enum(['schedules', 'places']).nullable().default(null),
  /** When it next turns live, local time; null while live or once it never will again. */
  next_start: z.string().nullable(),
  /** Its deal dish; null without one, or from a server from before them. */
  deal: dealSchema.nullable().default(null),
})

/** One place's allowance: offers switched on and not ended that use it, and how many may. */
const slotSchema = z.object({
  used: z.number().int(),
  /** Null is unlimited. */
  limit: z.number().int().nullable(),
})

export const offerListSchema = z.object({
  data: z.array(offerSchema),
  meta: z.object({
    limit: z.number().int(),
    /** How many offers of each place the package allows switched on at a time. */
    slots: z.object({ banner: slotSchema, popup: slotSchema, ad: slotSchema }),
    timezone: z.string(),
    /** The main currency: an amount off is in it. */
    currency: z.string(),
    /** The one other currency a dish may be priced in; null for none. */
    second_currency: z.string().nullable().default(null),
    /** Main per one second ("89000"); an amount off a dish in the second is amount / rate. */
    exchange_rate: z.string().nullable().default(null),
    /** Offer id => how often it was shown and tapped over 30 days. */
    stats: z.record(z.string(), z.object({ shown: z.number(), taps: z.number() })),
  }),
})

export const offerResponseSchema = z.object({ data: offerSchema })
export const offerCollectionSchema = z.object({ data: z.array(offerSchema) })

export type Offer = z.infer<typeof offerSchema>
export type OfferList = z.infer<typeof offerListSchema>
export type OfferSlots = OfferList['meta']['slots']

/** "2026-11-01" and "18:00" back from the local "2026-11-01T18:00". */
function splitLocal(value: string | null): { date: string; time: string } {
  if (!value) return { date: '', time: '' }
  const [date = '', time = ''] = value.split('T')
  return { date, time }
}

/** The calendar day before or after a "YYYY-MM-DD", in no timezone. */
function shiftDay(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const shifted = new Date(Date.UTC(year!, month! - 1, day! + days))
  return shifted.toISOString().slice(0, 10)
}

/** The deal dish as the editor holds it (empty for an offer without one). */
const dealFormSchema = z.object({
  name: menuTextField(MENU_TEXT_LIMITS.dishName, () => t('offers:deal.name')),
  ingredients: menuTextField(MENU_TEXT_LIMITS.ingredients, () => t('offers:deal.ingredients')),
  price: z.number().nullable(),
  /** The second currency's code when priced in it; empty for the main one. */
  currency: z.string(),
  category_id: z.number().int().nullable(),
  /** A new photo of its own, while it does not take the offer's picture (never removed here). */
  image: imageFieldSchema,
  use_offer_image: z.boolean(),
})

export const offerFormSchema = z
  .object({
    title: menuTextField(MENU_TEXT_LIMITS.offerTitle, () => t('offers:editor.title')),
    description: menuTextField(MENU_TEXT_LIMITS.offerDescription, () =>
      t('offers:editor.description'),
    ),
    image: imageFieldSchema,
    /** The offer being edited already has a picture (it counts unless removed). */
    saved_image: z.boolean(),
    show_text: z.boolean(),
    placements: z.array(z.enum(PLACEMENTS)),
    banner_shape: z.enum(BANNER_SHAPES),
    popup_shape: z.enum(POPUP_SHAPES),
    show_again: z.enum(SHOW_AGAIN),
    delay_seconds: z.number().int(),
    ad_delay_seconds: z.number().int(),
    ad_seconds: z.number().int(),
    gives: z.enum(GIVES),
    /** The offer being edited has a deal dish (choosing otherwise removes it). */
    has_deal: z.boolean(),
    deal: dealFormSchema,
    action: z.enum(ACTIONS),
    action_url: z.string().trim(),
    discount_type: z.enum(DISCOUNTS),
    discount_value: z.string().trim(),
    dish_ids: z.array(z.number().int()),
    when: z.enum(['always', 'custom']),
    starts_on: z.string(),
    starts_time: z.string(),
    ends_on: z.string(),
    ends_time: z.string(),
    repeat: z.enum(REPEATS),
    weekdays: z.array(z.enum(WEEKDAYS)),
    month_days: z.array(z.number().int()),
    all_day: z.boolean(),
    time_windows: z.array(windowSchema),
    shows_outside_hours: z.boolean(),
    is_active: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.show_text) {
      requireMainLanguage(
        values.title,
        'title',
        (language) => t('offers:validation.titleRequired', { language }),
        ctx,
      )
    } else {
      // A picture alone needs its picture: a new one, or the saved one kept.
      const picture =
        (values.image !== null && values.image !== REMOVED_IMAGE) ||
        (values.saved_image && values.image !== REMOVED_IMAGE)
      if (!picture) {
        ctx.addIssue({
          code: 'custom',
          path: ['image'],
          message: t('offers:validation.pictureNeeded'),
        })
      }
    }

    if (values.placements.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['placements'],
        message: t('offers:validation.placements'),
      })
    }

    if (
      values.gives !== 'deal' &&
      values.action === 'link' &&
      !/^https:\/\/\S+\.\S+/.test(values.action_url)
    ) {
      ctx.addIssue({ code: 'custom', path: ['action_url'], message: t('offers:validation.link') })
    }

    if (values.gives === 'deal') checkDeal(values.deal, ctx)

    if (
      values.gives === 'discount' &&
      values.discount_type === 'none' &&
      values.action !== 'dishes'
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['discount_type'],
        message: t('offers:validation.discountOrDishes'),
      })
    }

    if (values.gives === 'discount' && values.discount_type !== 'none') {
      const amount = discountNumber(values.discount_value)
      if (!(amount > 0)) {
        ctx.addIssue({
          code: 'custom',
          path: ['discount_value'],
          message: t('offers:validation.discountValue'),
        })
      } else if (values.discount_type === 'percent' && amount > 90) {
        ctx.addIssue({
          code: 'custom',
          path: ['discount_value'],
          message: t('offers:validation.percentMax'),
        })
      } else if (values.discount_type === 'second' && amount > FREE) {
        ctx.addIssue({
          code: 'custom',
          path: ['discount_value'],
          message: t('offers:validation.secondMax'),
        })
      }
    }

    if (
      values.gives === 'discount' &&
      (values.discount_type !== 'none' || values.action === 'dishes') &&
      values.dish_ids.length === 0
    ) {
      ctx.addIssue({ code: 'custom', path: ['dish_ids'], message: t('offers:validation.dishes') })
    }

    if (values.when === 'always') return

    const starts = toLocal(values.starts_on, values.starts_time, false)
    const ends = toLocal(values.ends_on, values.ends_time, true)
    if (starts !== null && ends !== null && ends <= starts) {
      ctx.addIssue({
        code: 'custom',
        path: ['ends_on'],
        message: t('offers:validation.endBeforeStart'),
      })
    }

    if (values.repeat === 'weekly' && values.weekdays.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['weekdays'], message: t('offers:validation.weekdays') })
    }
    if (values.repeat === 'monthly' && values.month_days.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['month_days'],
        message: t('offers:validation.monthDays'),
      })
    }

    if (values.all_day) return

    values.time_windows.forEach((window, index) => {
      for (const which of ['from', 'to'] as const) {
        if (window[which] === '') {
          ctx.addIssue({
            code: 'custom',
            path: ['time_windows', index, which],
            message: t('offers:validation.timeMissing'),
          })
        }
      }
      if (window.from !== '' && window.from === window.to) {
        ctx.addIssue({
          code: 'custom',
          path: ['time_windows', index, 'to'],
          message: t('offers:validation.sameTime'),
        })
      }
    })

    // The same rule as the server's OfferSchedule and opening hours' shifts.
    const problem = shiftProblem(
      values.time_windows.map((window) => ({ open: window.from, close: window.to })),
    )
    if (problem) {
      ctx.addIssue({
        code: 'custom',
        path: ['time_windows', problem.index, 'from'],
        message:
          problem.reason === 'overlap'
            ? t('offers:validation.overlap')
            : t('offers:validation.pastMidnightNotLast'),
      })
    }
  })

export type OfferFormValues = z.infer<typeof offerFormSchema>
type DealFormValues = OfferFormValues['deal']

/** A deal dish needs a name in the main language, a price and a category, as any dish. */
function checkDeal(deal: DealFormValues, ctx: z.RefinementCtx): void {
  requireMainLanguage(
    deal.name,
    'deal.name',
    (language) => t('offers:validation.dealName', { language }),
    ctx,
  )
  if (deal.price === null || !(deal.price > 0)) {
    ctx.addIssue({
      code: 'custom',
      path: ['deal', 'price'],
      message: t('offers:validation.dealPrice'),
    })
  }
  if (deal.category_id === null) {
    ctx.addIssue({
      code: 'custom',
      path: ['deal', 'category_id'],
      message: t('offers:validation.dealCategory'),
    })
  }
}

/** What an offer gives, as saved: its deal, else a discount or its dishes, else nothing. */
function givesOf(offer: Offer | null): Gives {
  if (offer?.deal) return 'deal'
  if (offer && (offer.discount_type !== 'none' || offer.action === 'dishes')) return 'discount'
  return 'nothing'
}

/**
 * The deal dish in the form: the saved one, or a new one named after the
 * offer (the name follows the title until the owner writes one) taking the
 * offer's picture. A saved photo is kept as its own: the server does not
 * say whether it came from the offer.
 */
function toDealForm(offer: Offer | null, languages: readonly string[]): DealFormValues {
  const deal = offer?.deal ?? null
  return {
    name: toMenuTextForm(deal?.name ?? offer?.title, languages),
    ingredients: toMenuTextForm(deal?.ingredients, languages),
    price: deal ? Number(deal.price) : null,
    currency: deal?.currency ?? '',
    category_id: deal?.category_id ?? null,
    image: null,
    use_offer_image: deal === null,
  }
}

/**
 * The local "2026-11-01T18:00" a date and a time make. An end date without
 * a time means through that day, so it ends at the next midnight.
 */
export function toLocal(date: string, time: string, isEnd: boolean): string | null {
  if (date === '') return null
  if (time !== '') return `${date}T${time}`
  return isEnd ? `${shiftDay(date, 1)}T00:00` : `${date}T00:00`
}

/** A new offer: a banner, always, no discount; or a saved one as the form holds it. */
export function toOfferForm(offer: Offer | null, languages: readonly string[]): OfferFormValues {
  const starts = splitLocal(offer?.starts_at ?? null)
  const ends = splitLocal(offer?.ends_at ?? null)
  // Ending at midnight reads as "until the day before", with no time.
  const endsAtMidnight = ends.date !== '' && ends.time === '00:00'
  const custom =
    offer !== null &&
    (offer.starts_at !== null ||
      offer.ends_at !== null ||
      offer.repeat !== 'always' ||
      offer.time_windows !== null)

  return {
    title: toMenuTextForm(offer?.title, languages),
    description: toMenuTextForm(offer?.description, languages),
    image: null,
    saved_image: offer?.image_url != null,
    show_text: offer?.show_text ?? true,
    placements: offer?.placements ?? ['banner'],
    banner_shape: offer?.banner_shape ?? 'rectangle',
    popup_shape: offer?.popup_shape ?? 'square',
    show_again: offer?.show_again ?? 'every_visit',
    delay_seconds: offer?.delay_seconds ?? 0,
    ad_delay_seconds: offer?.ad_delay_seconds ?? 2,
    // A new ad starts on one of the editor's choices.
    ad_seconds: offer?.ad_seconds ?? 5,
    gives: givesOf(offer),
    has_deal: offer?.deal != null,
    deal: toDealForm(offer, languages),
    action: offer?.action ?? 'none',
    action_url: offer?.action_url ?? '',
    discount_type: offer?.discount_type ?? 'none',
    discount_value: offer?.discount_value ? String(Number(offer.discount_value)) : '',
    // The server links a deal dish as the offer's one dish; it is not picked.
    dish_ids: offer ? offer.dish_ids.filter((id) => id !== offer.deal?.id) : [],
    when: custom ? 'custom' : 'always',
    starts_on: starts.date,
    starts_time: starts.time === '00:00' ? '' : starts.time,
    ends_on: endsAtMidnight ? shiftDay(ends.date, -1) : ends.date,
    ends_time: endsAtMidnight ? '' : ends.time,
    repeat: offer?.repeat ?? 'always',
    weekdays: offer?.weekdays ?? [],
    month_days: offer?.month_days ?? [],
    all_day: offer?.time_windows === null || offer?.time_windows === undefined,
    time_windows: offer?.time_windows ?? [{ from: '17:00', to: '19:00' }],
    shows_outside_hours: offer?.shows_outside_hours ?? false,
    is_active: offer?.is_active ?? true,
  }
}

/**
 * The schedule picks some days or hours, so "shown all the time" means
 * something: the offer shows outside them while its deal waits for them.
 */
export function hasHours(values: Pick<OfferFormValues, 'when' | 'repeat' | 'all_day'>): boolean {
  return values.when === 'custom' && (values.repeat !== 'always' || !values.all_day)
}

/** A deal dish as the API takes it (`deal` in StoreOfferRequest). */
export type DealPayload = {
  name: Record<string, string>
  ingredients: Record<string, string>
  price: number
  currency: string | null
  category_id: number
  use_offer_image: boolean
  /** A new photo of its own; left out, it keeps the one it has (the offer cannot remove it). */
  image_key?: string
}

/** What the API takes (StoreOfferRequest), without the picture's part. */
export type OfferPayload = {
  title: Record<string, string>
  description: Record<string, string>
  show_text: boolean
  placements: Placement[]
  banner_shape: BannerShape
  popup_shape: PopupShape
  action: (typeof ACTIONS)[number]
  action_url: string | null
  show_again: (typeof SHOW_AGAIN)[number]
  delay_seconds: number
  ad_delay_seconds: number
  ad_seconds: number
  discount_type: (typeof DISCOUNTS)[number]
  discount_value: number | null
  dish_ids: number[]
  starts_at: string | null
  ends_at: string | null
  repeat: (typeof REPEATS)[number]
  weekdays: Weekday[]
  month_days: number[]
  time_windows: TimeWindow[] | null
  shows_outside_hours: boolean
  is_active: boolean
  /** Left out: unchanged; null deletes the deal dish. */
  deal?: DealPayload | null
  image_key?: string
  delete_image?: true
}

/**
 * The deal dish as the API takes it, `use_offer_image` always said (the
 * server takes it as false on a later save otherwise); a photo of its own
 * only while it does not take the offer's, and only a new one.
 */
function toDealPayload(deal: DealFormValues): DealPayload {
  const photo =
    !deal.use_offer_image && deal.image !== null && deal.image !== REMOVED_IMAGE
      ? { image_key: deal.image.key }
      : {}
  return {
    name: deal.name,
    ingredients: deal.ingredients,
    price: deal.price ?? 0,
    currency: deal.currency === '' ? null : deal.currency,
    category_id: deal.category_id ?? 0,
    use_offer_image: deal.use_offer_image,
    ...photo,
  }
}

/**
 * The form as the API takes it: "always" sends no schedule at all. What the
 * offer gives decides the rest: a deal dish is opened by a tap and takes no
 * discount or picked dishes (`deal: null` removes a saved one); nothing to
 * order takes no dishes either.
 */
export function toOfferPayload(
  values: OfferFormValues,
): Omit<OfferPayload, 'image_key' | 'delete_image'> {
  const custom = values.when === 'custom'
  const repeat = custom ? values.repeat : 'always'
  const deal = values.gives === 'deal'
  const discount = values.gives === 'discount'
  const action = deal ? 'dishes' : !discount && values.action === 'dishes' ? 'none' : values.action
  const discountType = discount ? values.discount_type : 'none'

  return {
    title: values.title,
    description: values.description,
    show_text: values.show_text,
    placements: values.placements,
    banner_shape: values.banner_shape,
    popup_shape: values.popup_shape,
    action,
    action_url: action === 'link' ? values.action_url : null,
    show_again: values.show_again,
    delay_seconds: values.delay_seconds,
    ad_delay_seconds: values.ad_delay_seconds,
    ad_seconds: values.ad_seconds,
    discount_type: discountType,
    discount_value: discountType === 'none' ? null : discountNumber(values.discount_value),
    dish_ids: discount && (discountType !== 'none' || action === 'dishes') ? values.dish_ids : [],
    starts_at: custom ? toLocal(values.starts_on, values.starts_time, false) : null,
    ends_at: custom ? toLocal(values.ends_on, values.ends_time, true) : null,
    repeat,
    weekdays: repeat === 'weekly' ? values.weekdays : [],
    month_days: repeat === 'monthly' ? values.month_days : [],
    time_windows: custom && !values.all_day ? values.time_windows : null,
    shows_outside_hours: hasHours(values) && values.shows_outside_hours,
    is_active: values.is_active,
    ...(deal ? { deal: toDealPayload(values.deal) } : values.has_deal ? { deal: null } : {}),
  }
}
