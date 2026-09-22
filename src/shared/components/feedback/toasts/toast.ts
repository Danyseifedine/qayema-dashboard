import { toast as sonner } from 'sonner'
import { ApiError } from '@/shared/types/api'

/**
 * The only entry point to the toaster.
 *
 * Going through here keeps wording and duration consistent, and gives error
 * toasts one place to turn an `ApiError` into something a person can act on.
 */
export const toast = {
  success(message: string, description?: string) {
    sonner.success(message, { description })
  },

  info(message: string, description?: string) {
    sonner(message, { description })
  },

  /**
   * Shows a failure. An `ApiError` is unwrapped so the owner sees the server's
   * own wording rather than a generic apology, and a rate limit says how long
   * to wait.
   */
  error(fallback: string, error?: unknown) {
    sonner.error(fallback, { description: describe(error) })
  },

  dismiss() {
    sonner.dismiss()
  },
}

function describe(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return undefined

  if (error.isRateLimited) {
    const wait = error.retryAfter
    return wait === null
      ? 'Too many requests. Wait a moment and try again.'
      : `Too many requests. Try again in ${wait} seconds.`
  }

  if (error.isPaymentRequired && error.shortfall !== null) {
    return `You need ${error.shortfall.toLocaleString()} more coins.`
  }

  // A 422's field messages are shown on the fields themselves, so the toast
  // only carries the summary.
  return error.message
}
