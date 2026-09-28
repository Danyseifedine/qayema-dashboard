import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ApiError } from '@/shared/types/api'
import {
  fetchAdvancedStats,
  fetchStatsSummary,
  fetchStatsTeaser,
} from '@/features/analytics/api/analytics.api'
import type {
  AdvancedStats,
  StatsRange,
  StatsSummary,
  StatsTeaser,
} from '@/features/analytics/schemas/analytics.schema'
import { analyticsKeys } from '@/features/analytics/hooks/analytics-keys'

// Numbers move while the owner watches, but not by the second.
const STALE = 60_000

/** The summary every package gets. The last range stays up while the next loads. */
export function useStatsSummary(range: StatsRange): UseQueryResult<StatsSummary, ApiError> {
  return useQuery<StatsSummary, ApiError>({
    queryKey: analyticsKeys.summary(range),
    queryFn: ({ signal }) => fetchStatsSummary(range, signal),
    placeholderData: keepPreviousData,
    staleTime: STALE,
  })
}

/** The advanced breakdowns, only asked for when the package includes them. */
export function useAdvancedStats(
  range: StatsRange,
  enabled: boolean,
): UseQueryResult<AdvancedStats, ApiError> {
  return useQuery<AdvancedStats, ApiError>({
    queryKey: analyticsKeys.advanced(range),
    queryFn: ({ signal }) => fetchAdvancedStats(range, signal),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: STALE,
  })
}

/** This week's menu views, for a package without analytics. */
export function useStatsTeaser(): UseQueryResult<StatsTeaser, ApiError> {
  return useQuery<StatsTeaser, ApiError>({
    queryKey: analyticsKeys.teaser(),
    queryFn: ({ signal }) => fetchStatsTeaser(signal),
    staleTime: STALE,
  })
}
