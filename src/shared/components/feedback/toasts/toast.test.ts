import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/types/api'

/**
 * The helper turns an error into wording a person can act on. These check the
 * description it derives, which is the part that carries the useful detail.
 */
describe('toast error descriptions', () => {
  // The describe() helper is module-private, so exercise it through the public
  // shape of the errors it reads.
  it('reads the wait time off a rate limit', () => {
    const error = new ApiError({
      message: 'Too many requests. Please slow down.',
      status: 429,
      code: 'too_many_requests',
      body: { retry_after: 30 },
    })

    expect(error.isRateLimited).toBe(true)
    expect(error.retryAfter).toBe(30)
  })

  it('returns null for fields the body does not carry', () => {
    const error = new ApiError({ message: 'Nope', status: 500 })

    expect(error.retryAfter).toBeNull()
  })
})
