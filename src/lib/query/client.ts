import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/types/api'

/**
 * Shared cache defaults.
 *
 * Retrying a 4xx is pointless: a 401 is already redirecting, a 403/404 will
 * not change, and a 422 is the caller's fault. Only genuine server and network
 * failures are worth a second attempt.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false

  if (error instanceof ApiError) {
    if (error.status === 0) return true
    return error.status >= 500
  }

  return false
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
