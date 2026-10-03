import { z } from 'zod'

/**
 * The owner's analytics, from ../qayema/app/Services/Global/MenuStats.php.
 * `GET /api/analytics` is the summary every package gets; `GET /api/analytics/advanced`
 * is the rest, behind the `advanced_analytics` flag.
 */

export const STATS_RANGES = ['7d', '30d', '90d', 'all'] as const
export type StatsRange = (typeof STATS_RANGES)[number]

/** Ranges every package gets; the others need advanced analytics. */
export const BASIC_RANGES: readonly StatsRange[] = ['7d', '30d']

const count = z.number().int().nonnegative()

const statsSummarySchema = z.object({
  totals: z.object({
    views: count,
    unique_visitors: count,
    qr_scans: count,
    views_today: count,
    /** Null when the package does not take orders. */
    orders: count.nullable(),
    /** Orders marked done; only orders placed in the menu can be. */
    orders_done: count.nullable().default(null),
  }),
  /**
   * What `orders` counts: guests sent to WhatsApp (never known to be
   * completed), or orders placed in the menu. Null without ordering.
   */
  order_channel: z.enum(['whatsapp', 'menu']).nullable().default(null),
  series: z.array(z.object({ date: z.string(), views: count, qr_scans: count })),
})

export type StatsSummary = z.infer<typeof statsSummarySchema>

const breakdownSchema = z.array(z.object({ key: z.string(), count }))
const namedCountSchema = z.array(z.object({ name: z.string(), count }))
const termsSchema = z.array(z.object({ term: z.string(), count }))

export type Breakdown = z.infer<typeof breakdownSchema>

const GUEST_ACTIONS = [
  'dish_add',
  'category_open',
  'search',
  'search_miss',
  'whatsapp',
  'map',
  'call',
  'social',
  'language',
] as const
export type GuestAction = (typeof GUEST_ACTIONS)[number]

const advancedStatsSchema = z.object({
  /** The same totals for the period before; null for "All time". */
  previous: z
    .object({
      views: count,
      unique_visitors: count,
      qr_scans: count,
      orders: count.nullable(),
    })
    .nullable(),
  /** Views by hour of day, 0 to 23, in the restaurant's timezone. */
  hours: z.array(count).length(24),
  /** Views by weekday, Monday first. */
  weekdays: z.array(count).length(7),
  languages: breakdownSchema,
  actions: z.record(z.enum(GUEST_ACTIONS), count),
  top_added: namedCountSchema,
  top_categories: namedCountSchema,
  searches: termsSchema,
  missed_searches: termsSchema,
  /** Null when the package does not take orders. */
  funnel: z
    .object({
      visitors: count,
      carted: count,
      ordered: count,
      /** Whether "ordered" means sent to WhatsApp or placed in the menu. */
      channel: z.enum(['whatsapp', 'menu']).default('whatsapp'),
    })
    .nullable(),
})

export type AdvancedStats = z.infer<typeof advancedStatsSchema>

/** The one number every package sees: menu views over the last 7 days. */
const statsTeaserSchema = z.object({
  views: z.number().int(),
})
export type StatsTeaser = z.infer<typeof statsTeaserSchema>

export const statsSummaryResponseSchema = z.object({ data: statsSummarySchema })
export const statsTeaserResponseSchema = z.object({ data: statsTeaserSchema })
export const advancedStatsResponseSchema = z.object({ data: advancedStatsSchema })
