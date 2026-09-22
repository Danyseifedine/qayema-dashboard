import axios from 'axios'
import { ApiError, type ApiValidationErrors } from '@/shared/types/api'

type LaravelErrorBody = {
  message?: unknown
  code?: unknown
  errors?: unknown
}

function readValidationErrors(value: unknown): ApiValidationErrors | null {
  if (typeof value !== 'object' || value === null) return null

  const out: ApiValidationErrors = {}
  for (const [field, messages] of Object.entries(value)) {
    if (Array.isArray(messages)) {
      const strings = messages.filter((item): item is string => typeof item === 'string')
      if (strings.length > 0) out[field] = strings
    } else if (typeof messages === 'string') {
      out[field] = [messages]
    }
  }

  return Object.keys(out).length > 0 ? out : null
}

/**
 * Turns anything axios rejects with into an `ApiError`.
 *
 * Every `api/*` failure from Laravel is `{message, code}` (see
 * ../qayema/bootstrap/app.php), with `errors` added on a 422. A request that
 * never reached the server has no response at all, and becomes a status-0
 * error so callers can still show something useful.
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (axios.isAxiosError(error)) {
    const response = error.response

    if (!response) {
      return new ApiError({
        message: 'We could not reach the server. Check your connection and try again.',
        status: 0,
        code: 'network_error',
      })
    }

    const body = (response.data ?? {}) as LaravelErrorBody

    return new ApiError({
      message:
        typeof body.message === 'string' && body.message.length > 0
          ? body.message
          : 'Something went wrong. Please try again.',
      status: response.status,
      code: typeof body.code === 'string' ? body.code : null,
      errors: readValidationErrors(body.errors),
      // Keeps 402 shortfall and 429 retry_after reachable.
      body:
        typeof response.data === 'object' && response.data !== null
          ? (response.data as Record<string, unknown>)
          : {},
    })
  }

  // A thrown Error carries a message worth keeping, e.g. the schema-mismatch
  // text built by `request()`; replacing it loses the only useful detail.
  return new ApiError({
    message:
      error instanceof Error && error.message !== ''
        ? error.message
        : 'Something went wrong. Please try again.',
    status: 0,
    code: 'unknown_error',
  })
}
