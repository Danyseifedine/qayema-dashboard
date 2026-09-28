import { QUERY_ROOTS } from '@/lib/query/keys'
import type { StatsRange } from '@/features/analytics/schemas/analytics.schema'

export const analyticsKeys = {
  summary: (range: StatsRange) => [QUERY_ROOTS.analytics, 'summary', range] as const,
  advanced: (range: StatsRange) => [QUERY_ROOTS.analytics, 'advanced', range] as const,
  teaser: () => [QUERY_ROOTS.analytics, 'teaser'] as const,
}
