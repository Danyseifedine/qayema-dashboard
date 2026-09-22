import type { AxiosInstance } from 'axios'
import axios from 'axios'
import { env } from '@/config/env'
import { safeRedirect } from '@/lib/security/safe-redirect'

/**
 * Sends the owner back to the Laravel login page when the session is gone.
 *
 * Only a 401 triggers it. A 403 means signed in but not allowed, which the
 * calling screen should explain rather than silently navigating away.
 */
export function installAuthRedirectInterceptor(
  client: AxiosInstance,
  options: { onUnauthenticated?: () => void } = {},
): void {
  let redirecting = false

  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 401 && !redirecting) {
        redirecting = true
        options.onUnauthenticated?.()
        safeRedirect(env.VITE_LOGIN_URL)
      }

      throw error
    },
  )
}
