import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { ApiError } from '@/shared/types/api'
import { uploadTempImage } from './temp-upload.api'

let mock: MockAdapter

function fakeImage(name = 'logo.png', type = 'image/png'): File {
  return new File([new Uint8Array([1, 2, 3, 4])], name, { type })
}

describe('uploadTempImage', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
  })

  afterEach(() => {
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
  })

  it('primes CSRF, posts multipart, and returns the parsed key', async () => {
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf-abc' })
    mock.onPost('/api/uploads/temp').reply(200, {
      key: '11111111-2222-4333-8444-555555555555',
      original_size: '1.4 MB',
      optimized_size: '42.3 KB',
      saved_percent: 97,
    })

    const result = await uploadTempImage(fakeImage(), { context: 'logo' })

    expect(result.key).toBe('11111111-2222-4333-8444-555555555555')
    expect(result.optimized_size).toBe('42.3 KB')
    expect(result.saved_percent).toBe(97)

    const post = mock.history.post[0]!
    expect(post.headers?.['X-CSRF-TOKEN']).toBe('csrf-abc')

    // The body must be multipart with the exact field names the API expects,
    // and no explicit Content-Type so the browser sets the boundary.
    const body = post.data as FormData
    expect(body).toBeInstanceOf(FormData)
    expect(body.get('context')).toBe('logo')
    expect(body.get('file')).toBeInstanceOf(File)
  })

  it('turns a 422 into an ApiError carrying the field messages', async () => {
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf-abc' })
    mock.onPost('/api/uploads/temp').reply(422, {
      message: 'The given data was invalid.',
      code: 'validation_failed',
      errors: { file: ['Images must be JPEG, PNG, or WebP.'] },
    })

    const error = await uploadTempImage(fakeImage(), { context: 'dish' }).catch(
      (thrown: unknown) => thrown,
    )

    expect(error).toBeInstanceOf(ApiError)
    const apiError = error as ApiError
    expect(apiError.isValidation).toBe(true)
    expect(apiError.errors?.file?.[0]).toBe('Images must be JPEG, PNG, or WebP.')
  })

  it('flags a 429 as rate limited so the caller does not retry', async () => {
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf-abc' })
    mock.onPost('/api/uploads/temp').reply(429, {
      message: 'Too many requests. Please slow down.',
      code: 'too_many_requests',
      retry_after: 30,
    })

    const error = (await uploadTempImage(fakeImage(), { context: 'dish' }).catch(
      (thrown: unknown) => thrown,
    )) as ApiError

    expect(error.isRateLimited).toBe(true)
    expect(error.code).toBe('too_many_requests')
  })

  it('rejects a response that does not match the contract', async () => {
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf-abc' })
    // `key` is not a UUID and the size fields are missing.
    mock.onPost('/api/uploads/temp').reply(200, { key: 'not-a-uuid' })

    await expect(uploadTempImage(fakeImage(), { context: 'logo' })).rejects.toBeInstanceOf(ApiError)
  })
})
