import type { AxiosRequestConfig } from 'axios'
import type { ZodType } from 'zod'
import { api } from './client'
import { toApiError } from './errors'

/**
 * Performs a request and parses the response against a schema.
 *
 * Returning parsed data means a backend contract change fails here, at the
 * boundary, instead of surfacing as `undefined` deep inside a component.
 */
export async function request<T>(schema: ZodType<T>, config: AxiosRequestConfig): Promise<T> {
  let payload: unknown

  try {
    const response = await api.request(config)
    payload = response.data
  } catch (error) {
    throw toApiError(error)
  }

  const result = schema.safeParse(payload)

  if (!result.success) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[api] response did not match its schema', {
        url: config.url,
        issues: result.error.issues,
      })
    }

    throw toApiError(
      new Error(`The server sent an unexpected response for ${config.url ?? 'this request'}.`),
    )
  }

  return result.data
}
