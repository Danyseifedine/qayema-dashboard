import { act, renderHook, waitFor } from '@testing-library/react'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { useTempUpload } from './use-temp-upload'

let mock: MockAdapter

function png(name = 'x.png', bytes = 32): File {
  return new File([new Uint8Array(bytes)], name, { type: 'image/png' })
}

describe('useTempUpload', () => {
  beforeEach(() => {
    mock = new MockAdapter(api)
    resetCsrfToken(api)
    installCsrfInterceptor(api)
    mock.onGet('/api/csrf-token').reply(200, { token: 'csrf' })
    // jsdom has no decoder; the guard treats an unreadable size as a pass and
    // leaves the dimension check to the server.
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('no decoder')))
  })

  afterEach(() => {
    mock.restore()
    api.interceptors.request.clear()
    api.interceptors.response.clear()
    resetCsrfToken(api)
    vi.unstubAllGlobals()
  })

  it('explains a 413 as a size problem rather than a generic failure', async () => {
    mock.onPost('/api/uploads/temp').reply(413, {
      message: 'That upload is too large. Images must be 10 MB or smaller.',
      code: 'payload_too_large',
    })

    const { result } = renderHook(() => useTempUpload('dish'))
    await act(async () => {
      await result.current.upload(png())
    })

    await waitFor(() =>
      expect(result.current.error).toBe(
        'That image is too large. Images must be 10 MB or smaller.',
      ),
    )
  })

  it('tells the owner how long to wait when rate limited', async () => {
    mock.onPost('/api/uploads/temp').reply(429, {
      message: 'Too many requests. Please slow down.',
      code: 'too_many_requests',
      retry_after: 30,
    })

    const { result } = renderHook(() => useTempUpload('dish'))
    await act(async () => {
      await result.current.upload(png())
    })

    await waitFor(() =>
      expect(result.current.error).toBe('Too many uploads in a row. Try again in 30 seconds.'),
    )
  })

  it('shows the server wording for a 422 about the file', async () => {
    mock.onPost('/api/uploads/temp').reply(422, {
      message: 'The given data was invalid.',
      code: 'validation_failed',
      errors: { file: ['That image is too large for the server to accept.'] },
    })

    const { result } = renderHook(() => useTempUpload('dish'))
    await act(async () => {
      await result.current.upload(png())
    })

    await waitFor(() =>
      expect(result.current.error).toBe('That image is too large for the server to accept.'),
    )
  })

  it('rejects an oversized image without calling the API', async () => {
    const { result } = renderHook(() => useTempUpload('dish'))
    const huge = new File([new Uint8Array(4)], 'huge.png', { type: 'image/png' })
    Object.defineProperty(huge, 'size', { value: 11 * 1024 * 1024 })

    await act(async () => {
      await result.current.upload(huge)
    })

    expect(result.current.error).toBe('Images must be 10 MB or smaller.')
    expect(mock.history.post).toHaveLength(0)
  })

  it('rejects an image past the pixel cap without calling the API', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 8000, height: 200, close: vi.fn() }),
    )

    const { result } = renderHook(() => useTempUpload('dish'))
    await act(async () => {
      await result.current.upload(png())
    })

    expect(result.current.error).toBe('Images must be at most 6000 × 6000 pixels.')
    expect(mock.history.post).toHaveLength(0)
  })
})
