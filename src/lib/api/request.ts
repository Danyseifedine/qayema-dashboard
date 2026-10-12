import { t } from '@/lib/i18n'
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
import type { ZodType } from 'zod'
import { api } from '@/lib/api/client'
import { toApiError } from '@/lib/api/errors'
import { ApiError } from '@/shared/types/api'

/** Writes that land the same however often they are sent: safe to send again. */
const REPEATABLE = new Set(['put', 'patch', 'delete'])

/** The waits, in ms, before a repeatable write that never reached the server is sent again. */
export const RESEND_AFTER = [1_000, 2_000] as const

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms))

/**
 * Sends the request. A repeatable write that never reached the server, as
 * a patchy phone connection drops one, goes again after RESEND_AFTER: an
 * owner's save is not lost to one bad second. A create (POST) is never sent
 * twice, so nothing is made twice; reads are TanStack Query's to retry.
 */
async function send(config: AxiosRequestConfig, attempt = 0): Promise<AxiosResponse> {
  try {
    return await api.request(config)
  } catch (error) {
    const repeatable = REPEATABLE.has((config.method ?? 'get').toLowerCase())
    const unanswered = axios.isAxiosError(error) && !error.response && !axios.isCancel(error)
    if (!repeatable || !unanswered || attempt >= RESEND_AFTER.length) throw error

    await wait(RESEND_AFTER[attempt]!)
    return send(config, attempt + 1)
  }
}

/**
 * Performs a request and parses the response against a schema.
 *
 * Returning parsed data means a backend contract change fails here, at the
 * boundary, instead of surfacing as `undefined` deep inside a component.
 */
export async function request<T>(schema: ZodType<T>, config: AxiosRequestConfig): Promise<T> {
  let payload: unknown

  try {
    const response = await send(config)
    payload = response.data
  } catch (error) {
    // A request the app called off (a page left, a newer one asked) is no
    // failure: it goes back as it came, for TanStack Query to drop, never
    // as "We could not connect".
    if (axios.isCancel(error)) throw error
    throw toApiError(error)
  }

  const result = schema.safeParse(payload)

  if (!result.success) {
    if (import.meta.env.DEV) {
      console.error('[api] response did not match its schema', {
        url: config.url,
        issues: result.error.issues,
      })
    }

    // The URL is in the log above; the owner only needs to know it failed.
    throw new ApiError({ message: t('errors.unexpected'), status: 0, code: 'unexpected_response' })
  }

  return result.data
}
