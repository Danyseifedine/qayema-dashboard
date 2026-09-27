import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ApiError } from '@/shared/types/api'
import { fetchSession } from '@/features/auth/api/session.api'
import { sessionKeys } from '@/features/auth/hooks/session-keys'
import type { AuthUser } from '@/features/auth/schemas/user.schema'

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
