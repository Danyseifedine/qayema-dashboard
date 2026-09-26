import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ApiError } from '@/shared/types/api'
import { fetchAdvancedStats, fetchStatsSummary } from '../api/stats.api'
import type { AdvancedStats, StatsRange, StatsSummary } from '../schemas/stats.schema'
import { overviewKeys } from './overview-keys'

// Numbers move while the owner watches, but not by the second.
const STALE = 60_000

/** The summary every package gets. The last range stays up while the next loads. */
export function useStatsSummary(range: StatsRange): UseQueryResult<StatsSummary, ApiError> {
  return useQuery<StatsSummary, ApiError>({
    queryKey: overviewKeys.summary(range),
    queryFn: ({ signal }) => fetchStatsSummary(range, signal),
    placeholderData: keepPreviousData,
    staleTime: STALE,
  })
}

/** The advanced breakdowns — only asked for when the package includes them. */
export function useAdvancedStats(
  range: StatsRange,
  enabled: boolean,
): UseQueryResult<AdvancedStats, ApiError> {
  return useQuery<AdvancedStats, ApiError>({
    queryKey: overviewKeys.advanced(range),
    queryFn: ({ signal }) => fetchAdvancedStats(range, signal),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: STALE,
  })
}
