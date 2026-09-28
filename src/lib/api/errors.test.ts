import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import { toApiError } from '@/lib/api/errors'
import { ApiError } from '@/shared/types/api'

function axiosFailure(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() }
  const response = {
    status,
    statusText: '',
    data,
    headers: {},
    config,
  } as AxiosResponse
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, response)
}

describe('toApiError', () => {
  it('passes an ApiError through untouched', () => {
    const original = new ApiError({ message: 'Already mapped', status: 409 })
    expect(toApiError(original)).toBe(original)
  })

  it('turns a request that never reached the server into a status-0 network error', () => {
    const error = toApiError(new AxiosError('Network Error', 'ERR_NETWORK'))

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(0)
    expect(error.code).toBe('network_error')
    expect(error.message).toBe(
      'We could not reach the server. Check your connection and try again.',
    )
  })

  it('keeps the Laravel envelope: message, code and body', () => {
    const error = toApiError(
      axiosFailure(429, { message: 'Slow down', code: 'rate_limited', retry_after: 12 }),
    )

    expect(error.status).toBe(429)
    expect(error.message).toBe('Slow down')
    expect(error.code).toBe('rate_limited')
    expect(error.retryAfter).toBe(12)
    expect(error.isRateLimited).toBe(true)
    expect(error.errors).toBeNull()
  })

  it('reads 422 field errors, whether a list or a single string', () => {
    const error = toApiError(
      axiosFailure(422, {
        message: 'The name field is required.',
        code: 'validation_failed',
        errors: {
          name: ['The name field is required.', 42],
          price: 'The price must be a number.',
          // Neither a list of strings nor a string: dropped.
          slug: [1, 2],
          image: { nested: true },
        },
      }),
    )

    expect(error.isValidation).toBe(true)
    expect(error.errors).toEqual({
      name: ['The name field is required.'],
      price: ['The price must be a number.'],
    })
  })

  it('reports no field errors when none of them are usable', () => {
    expect(toApiError(axiosFailure(422, { errors: { name: [3] } })).errors).toBeNull()
    expect(toApiError(axiosFailure(422, { errors: 'bad' })).errors).toBeNull()
    expect(toApiError(axiosFailure(422, { errors: null })).errors).toBeNull()
  })

  it('falls back to the generic message when the body has none', () => {
    const blank = toApiError(axiosFailure(500, { message: '' }))
    expect(blank.message).toBe('Something went wrong. Please try again.')
    expect(blank.code).toBeNull()

    const numeric = toApiError(axiosFailure(500, { message: 5, code: 7 }))
    expect(numeric.message).toBe('Something went wrong. Please try again.')
    expect(numeric.code).toBeNull()
  })

  it('copes with a body that is empty or not an object', () => {
    const empty = toApiError(axiosFailure(502, undefined))
    expect(empty.status).toBe(502)
    expect(empty.body).toEqual({})

    const html = toApiError(axiosFailure(502, '<html>Bad gateway</html>'))
    expect(html.message).toBe('Something went wrong. Please try again.')
    expect(html.body).toEqual({})
  })

  it("keeps a thrown Error's message", () => {
    const error = toApiError(new Error('The server sent an unexpected response.'))

    expect(error.status).toBe(0)
    expect(error.code).toBe('unknown_error')
    expect(error.message).toBe('The server sent an unexpected response.')
  })

  it('uses the generic message for an empty Error or a non-Error throw', () => {
    expect(toApiError(new Error('')).message).toBe('Something went wrong. Please try again.')
    expect(toApiError('boom').message).toBe('Something went wrong. Please try again.')
    expect(toApiError(undefined).code).toBe('unknown_error')
  })
})
