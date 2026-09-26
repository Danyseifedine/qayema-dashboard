import { z } from 'zod'

/**
 * The owner's analytics, from ../qayema/app/Services/Global/MenuStats.php.
 * `GET /api/stats` is the summary every package gets; `GET /api/stats/advanced`
 * is the rest, behind the `advanced_analytics` flag.
 */

export const STATS_RANGES = ['7d', '30d', '90d', 'all'] as const
export type StatsRange = (typeof STATS_RANGES)[number]

/** Ranges every package gets; the others need advanced analytics. */
export const BASIC_RANGES: readonly StatsRange[] = ['7d', '30d']

export const RANGE_LABELS: Record<StatsRange, string> = {
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
  all: 'All time',
}

const count = z.number().int().nonnegative()

export const statsSummarySchema = z.object({
  range: z.enum(STATS_RANGES),
  timezone: z.string(),
  totals: z.object({
    views: count,
    unique_visitors: count,
    qr_scans: count,
    views_today: count,
    /** Null when the package does not take orders. */
    orders: count.nullable(),
  }),
  series: z.array(z.object({ date: z.string(), views: count, qr_scans: count })),
  last_visit_at: z.string().nullable(),
})

export type StatsSummary = z.infer<typeof statsSummarySchema>

const breakdownSchema = z.array(z.object({ key: z.string(), count }))
const namedCountSchema = z.array(z.object({ name: z.string(), count }))
const termsSchema = z.array(z.object({ term: z.string(), count }))

export type Breakdown = z.infer<typeof breakdownSchema>

export const GUEST_ACTIONS = [
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

export const advancedStatsSchema = z.object({
  range: z.enum(STATS_RANGES),
  /** The same totals for the period before; null for "All time". */
  previous: z
    .object({
      views: count,
      unique_visitors: count,
      qr_scans: count,
      orders: count.nullable(),
    })
    .nullable(),
  /** Views by hour of day, 0–23, in the restaurant's timezone. */
  hours: z.array(count).length(24),
  /** Views by weekday, Monday first. */
  weekdays: z.array(count).length(7),
  devices: breakdownSchema,
  browsers: breakdownSchema,
  systems: breakdownSchema,
  languages: breakdownSchema,
  actions: z.record(z.enum(GUEST_ACTIONS), count),
  top_added: namedCountSchema,
  top_categories: namedCountSchema,
  searches: termsSchema,
  missed_searches: termsSchema,
  orders: z
    .object({
      count,
      cancelled: count,
      revenue: z.number().nonnegative(),
      average: z.number().nonnegative(),
      currency: z.string(),
      top_dishes: z.array(
        z.object({ name: z.string(), quantity: count, revenue: z.number().nonnegative() }),
      ),
    })
    .nullable(),
  funnel: z.object({ visitors: count, carted: count, ordered: count }).nullable(),
})

export type AdvancedStats = z.infer<typeof advancedStatsSchema>

export const statsSummaryResponseSchema = z.object({ data: statsSummarySchema })
export const advancedStatsResponseSchema = z.object({ data: advancedStatsSchema })
