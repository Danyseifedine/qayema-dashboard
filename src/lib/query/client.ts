import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/types/api'

/** Tries after a request that never reached the server: about 15 s of waiting (1, 2, 4, 8 s apart). */
export const NETWORK_RETRIES = 4

/** Tries after a server failure: it is rarely fixed by waiting long. */
export const SERVER_RETRIES = 2

/**
 * Shared cache defaults.
 *
 * Retrying a 4xx is pointless: a 401 is already redirecting, a 403/404 will
 * not change, and a 422 is the caller's fault. Only genuine server and network
 * failures are worth another attempt, and a dropped connection most of all:
 * on a slow or patchy phone connection a request fails without an answer
 * now and then, and the next one goes through. So those are tried for about
 * fifteen seconds (TanStack's own backoff) before the page says it could not
 * connect; while the phone reports itself offline, queries simply wait.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (!(error instanceof ApiError)) return false
  if (error.status === 0) return failureCount < NETWORK_RETRIES
  return error.status >= 500 && failureCount < SERVER_RETRIES
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
