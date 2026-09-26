import { request } from '@/lib/api'
import {
  advancedStatsResponseSchema,
  statsSummaryResponseSchema,
  type AdvancedStats,
  type StatsRange,
  type StatsSummary,
} from '../schemas/stats.schema'

export async function fetchStatsSummary(
  range: StatsRange,
  signal?: AbortSignal,
): Promise<StatsSummary> {
  const { data } = await request(statsSummaryResponseSchema, {
    method: 'GET',
    url: '/api/stats',
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
    url: '/api/stats/advanced',
    params: { range },
    signal,
  })
  return data
}
