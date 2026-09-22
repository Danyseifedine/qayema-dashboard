import { useMutation, useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { safeRedirect } from '@/lib/security/safe-redirect'
import type { ApiError } from '@/shared/types/api'
import { logout } from '../api/session.api'

/**
 * Logs out, then leaves.
 *
 * The redirect happens only after the server confirms the session is gone.
 * Redirecting regardless would leave an owner still signed in on the API
 * domain whenever the request failed.
 */
export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError>({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear()
      safeRedirect(env.VITE_LOGIN_URL)
    },
  })
}
