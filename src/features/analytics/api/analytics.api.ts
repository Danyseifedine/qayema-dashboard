import { request } from '@/lib/api'
import {
  advancedStatsResponseSchema,
  statsSummaryResponseSchema,
  statsTeaserResponseSchema,
  type AdvancedStats,
  type StatsRange,
  type StatsSummary,
  type StatsTeaser,
} from '@/features/analytics/schemas/analytics.schema'

export async function fetchStatsSummary(
  range: StatsRange,
  signal?: AbortSignal,
): Promise<StatsSummary> {
  const { data } = await request(statsSummaryResponseSchema, {
    method: 'GET',
    url: '/api/analytics',
    params: { range },
    signal,
  })
  return data
}

export async function fetchAdvancedStats(
  range: StatsRange,
  signal?: AbortSignal,
): Promise<AdvancedStats> {
  const { data } = await request(advancedStatsResponseSchema, {
    method: 'GET',
    url: '/api/analytics/advanced',
    params: { range },
    signal,
  })
  return data
}

export async function fetchStatsTeaser(signal?: AbortSignal): Promise<StatsTeaser> {
  const { data } = await request(statsTeaserResponseSchema, {
    method: 'GET',
    url: '/api/analytics/teaser',
    signal,
  })
  return data
}
