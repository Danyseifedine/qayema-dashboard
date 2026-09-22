import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { QUERY_ROOTS } from '@/lib/query/keys'
import type { ApiError } from '@/shared/types/api'
import { fetchSession } from '../api/session.api'
import type { AuthUser } from '../schemas/user.schema'

export const sessionKeys = {
  all: [QUERY_ROOTS.session] as const,
  current: () => [QUERY_ROOTS.session, 'current'] as const,
}

/**
 * The signed-in owner.
 *
 * A 401 is not retried and not treated as a crash: the interceptor already
 * sends the visitor to the login page, so the query simply settles in error.
 */
export function useSession(): UseQueryResult<AuthUser, ApiError> {
  return useQuery<AuthUser, ApiError>({
    queryKey: sessionKeys.current(),
    queryFn: ({ signal }) => fetchSession(signal),
    staleTime: 60_000,
  })
}
