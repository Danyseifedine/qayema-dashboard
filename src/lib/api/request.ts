import { t } from '@/lib/i18n'
import type { AxiosRequestConfig } from 'axios'
import type { ZodType } from 'zod'
import { api } from '@/lib/api/client'
import { toApiError } from '@/lib/api/errors'

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

    // The URL is in the log above; the owner only needs to know it failed.
    throw toApiError(new Error(t('errors.unexpected')))
  }

  return result.data
}
