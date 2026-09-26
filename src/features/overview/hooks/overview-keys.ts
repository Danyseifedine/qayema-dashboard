import { QUERY_ROOTS } from '@/lib/query/keys'
import type { StatsRange } from '../schemas/stats.schema'

export const overviewKeys = {
  all: [QUERY_ROOTS.stats] as const,
  summary: (range: StatsRange) => [QUERY_ROOTS.stats, 'summary', range] as const,
  advanced: (range: StatsRange) => [QUERY_ROOTS.stats, 'advanced', range] as const,
}
