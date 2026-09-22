/**
 * Shapes the Laravel API speaks. See ../qayema/bootstrap/app.php — every
 * `api/*` error is `{message, code}`, and validation failures add `errors`.
 */

/** Laravel resources wrap payloads in a `data` key. */
export type ApiEnvelope<T> = { data: T }

/** Laravel's paginator meta block. */
export type ApiPaginationMeta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export type ApiPaginated<T> = ApiEnvelope<T[]> & { meta: ApiPaginationMeta }

/** Field name -> list of messages, exactly as a 422 returns it. */
export type ApiValidationErrors = Record<string, string[]>

/**
 * A normalised API failure. Every request rejects with one of these rather
 * than a raw axios error, so callers never reach into `error.response`.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string | null
  readonly errors: ApiValidationErrors | null
  /**
   * The raw response body. Some failures carry fields beyond the envelope:
   * a 429 adds `retry_after`. Read them through the helpers below.
   */
  readonly body: Record<string, unknown>

  constructor(params: {
    message: string
    status: number
    code?: string | null
    errors?: ApiValidationErrors | null
    body?: Record<string, unknown>
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.status = params.status
    this.code = params.code ?? null
    this.errors = params.errors ?? null
    this.body = params.body ?? {}
  }

  /** Reads a numeric field from the body, or null when it is absent. */
  private number(key: string): number | null {
    const value = this.body[key]
    return typeof value === 'number' ? value : null
  }

  /** Seconds to wait, on a 429. */
  get retryAfter(): number | null {
    return this.number('retry_after')
  }

  /** 422 — the server rejected the submitted fields. */
  get isValidation(): boolean {
    return this.status === 422 && this.errors !== null
  }

  /** 401 — the session is gone; the caller should bounce to login. */
  get isUnauthenticated(): boolean {
    return this.status === 401
  }

  /** 429 — a rate limiter rejected the call. */
  get isRateLimited(): boolean {
    return this.status === 429
  }
}
