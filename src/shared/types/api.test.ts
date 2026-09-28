import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/types/api'

describe('ApiError', () => {
  it('is an Error carrying the envelope it was given', () => {
    const error = new ApiError({
      message: 'The name field is required.',
      status: 422,
      code: 'validation_failed',
      errors: { name: ['The name field is required.'] },
      body: { message: 'The name field is required.' },
    })

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('ApiError')
    expect(error.message).toBe('The name field is required.')
    expect(error.status).toBe(422)
    expect(error.code).toBe('validation_failed')
    expect(error.errors).toEqual({ name: ['The name field is required.'] })
    expect(error.body).toEqual({ message: 'The name field is required.' })
  })

  it('defaults the optional parts to null and an empty body', () => {
    const error = new ApiError({ message: 'Nope', status: 500 })

    expect(error.code).toBeNull()
    expect(error.errors).toBeNull()
    expect(error.body).toEqual({})
  })

  it('reads the wait time off a rate limit', () => {
    const error = new ApiError({
      message: 'Too many requests.',
      status: 429,
      body: { retry_after: 30 },
    })

    expect(error.isRateLimited).toBe(true)
    expect(error.retryAfter).toBe(30)
  })

  it('has no wait time when the body lacks one or it is not a number', () => {
    expect(new ApiError({ message: 'x', status: 429 }).retryAfter).toBeNull()
    expect(
      new ApiError({ message: 'x', status: 429, body: { retry_after: '30' } }).retryAfter,
    ).toBeNull()
  })

  it('is a validation failure only on a 422 that lists fields', () => {
    expect(new ApiError({ message: 'x', status: 422, errors: { a: ['b'] } }).isValidation).toBe(
      true,
    )
    expect(new ApiError({ message: 'x', status: 422 }).isValidation).toBe(false)
    expect(new ApiError({ message: 'x', status: 400, errors: { a: ['b'] } }).isValidation).toBe(
      false,
    )
  })

  it('knows a lost session and a rate limit by status', () => {
    const unauthenticated = new ApiError({ message: 'x', status: 401 })
    const other = new ApiError({ message: 'x', status: 500 })

    expect(unauthenticated.isUnauthenticated).toBe(true)
    expect(unauthenticated.isRateLimited).toBe(false)
    expect(other.isUnauthenticated).toBe(false)
    expect(other.isRateLimited).toBe(false)
  })
})
