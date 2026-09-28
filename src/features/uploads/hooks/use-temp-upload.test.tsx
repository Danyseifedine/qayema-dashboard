import { act, renderHook, waitFor } from '@testing-library/react'
import type { AxiosProgressEvent } from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api/client'
import { installCsrfInterceptor, resetCsrfToken } from '@/lib/api/interceptors/csrf'
import { uploadTempImage } from '@/features/uploads/api/temp-upload.api'
import { useTempUpload } from '@/features/uploads/hooks/use-temp-upload'

// Passes through to the real request unless a test says otherwise; only the
// request layer can raise something that is not an ApiError.
vi.mock('@/features/uploads/api/temp-upload.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/uploads/api/temp-upload.api')>()
  return { ...actual, uploadTempImage: vi.fn(actual.uploadTempImage) }
})

const RESULT = {
  key: '11111111-2222-4333-8444-555555555555',
  original_size: '1.4 MB',
  optimized_size: '42.3 KB',
  saved_percent: 97,
}

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
    vi.mocked(uploadTempImage).mockClear()
  })

  it('explains a 413 as a size problem rather than a generic failure', async () => {
    mock.onPost('/api/uploads/temp').reply(413, {
      message: 'That upload is too large. Images must be 20 MB or smaller.',
      code: 'payload_too_large',
    })

    const { result } = renderHook(() => useTempUpload('dish'))
    await act(async () => {
      await result.current.upload(png())
    })

    await waitFor(() =>
      expect(result.current.error).toBe(
        'That image is too large. Images must be 20 MB or smaller.',
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
    Object.defineProperty(huge, 'size', { value: 21 * 1024 * 1024 })

    await act(async () => {
      await result.current.upload(huge)
    })

    expect(result.current.error).toBe('Images must be 20 MB or smaller.')
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
  it('walks through progress to the result', async () => {
    let report: ((event: AxiosProgressEvent) => void) | undefined
    let finish!: (reply: [number, unknown]) => void
    mock.onPost('/api/uploads/temp').reply((config) => {
      report = config.onUploadProgress
      return new Promise((done) => {
        finish = done
      })
    })

    const { result } = renderHook(() => useTempUpload('logo'))
    let pending!: Promise<unknown>
    act(() => {
      pending = result.current.upload(png())
    })

    await waitFor(() => expect(result.current.uploading).toBe(true))
    expect(result.current.progress).toBe(0)

    act(() => report!({ loaded: 1, total: 2 } as AxiosProgressEvent))
    expect(result.current.progress).toBe(50)
    act(() => report!({ loaded: 1 } as AxiosProgressEvent))
    expect(result.current.progress).toBeNull()

    await act(async () => {
      finish([200, RESULT])
      await expect(pending).resolves.toEqual(RESULT)
    })

    expect(result.current).toMatchObject({
      uploading: false,
      progress: 100,
      error: null,
      result: RESULT,
    })

    // A late progress event after the upload settled changes nothing.
    act(() => report!({ loaded: 1, total: 4 } as AxiosProgressEvent))
    expect(result.current.progress).toBe(100)

    const body = mock.history.post[0]!.data as FormData
    expect(body.get('context')).toBe('logo')
  })

  it('asks the owner to wait when rate limited without a wait time', async () => {
    mock.onPost('/api/uploads/temp').reply(429, {
      message: 'Too many requests. Please slow down.',
      code: 'too_many_requests',
    })

    const { result } = renderHook(() => useTempUpload('dish'))
    await act(async () => {
      await result.current.upload(png())
    })

    expect(result.current.error).toBe(
      'Too many uploads in a row. Wait a moment before trying again.',
    )
  })

  it('shows a 422 about the context when there is none about the file', async () => {
    mock.onPost('/api/uploads/temp').reply(422, {
      message: 'The given data was invalid.',
      code: 'validation_failed',
      errors: { context: ['The selected context is invalid.'] },
    })

    const { result } = renderHook(() => useTempUpload('dish'))
    await act(async () => {
      await result.current.upload(png())
    })

    expect(result.current.error).toBe('The selected context is invalid.')
  })

  it('falls back to the summary for a 422 that names neither field', async () => {
    mock.onPost('/api/uploads/temp').reply(422, {
      message: 'The given data was invalid.',
      code: 'validation_failed',
      errors: { dimensions: ['Too wide.'] },
    })

    const { result } = renderHook(() => useTempUpload('dish'))
    await act(async () => {
      await result.current.upload(png())
    })

    expect(result.current.error).toBe('The given data was invalid.')
  })

  it('shows the server message for any other failure', async () => {
    mock.onPost('/api/uploads/temp').reply(500, { message: 'Server error', code: 'server_error' })

    const { result } = renderHook(() => useTempUpload('dish'))
    let returned: unknown
    await act(async () => {
      returned = await result.current.upload(png())
    })

    expect(returned).toBeNull()
    expect(result.current).toMatchObject({ uploading: false, error: 'Server error', result: null })
  })

  it('gives a generic apology for an error that is not from the API', async () => {
    vi.mocked(uploadTempImage).mockRejectedValueOnce(new Error('boom'))

    const { result } = renderHook(() => useTempUpload('dish'))
    await act(async () => {
      await result.current.upload(png())
    })

    expect(result.current.error).toBe('That image could not be uploaded. Please try again.')
  })

  it('rejects a file type the server does not take', async () => {
    const { result } = renderHook(() => useTempUpload('dish'))
    await act(async () => {
      await result.current.upload(
        new File([new Uint8Array(4)], 'menu.pdf', { type: 'application/pdf' }),
      )
    })

    expect(result.current.error).toBe('Images must be JPEG, PNG, or WebP.')
    expect(mock.history.post).toHaveLength(0)
  })

  it('lets a second pick replace the first without reporting the first as failed', async () => {
    // A real XHR rejects once aborted; the mock has to be told to.
    mock.onPost('/api/uploads/temp').replyOnce(
      (config) =>
        new Promise((_done, fail) => {
          config.signal?.addEventListener?.('abort', () => fail(new Error('canceled')))
        }),
    )
    mock.onPost('/api/uploads/temp').replyOnce(200, RESULT)

    const { result } = renderHook(() => useTempUpload('dish'))
    let first!: Promise<unknown>
    act(() => {
      first = result.current.upload(png('first.png'))
    })
    await waitFor(() => expect(mock.history.post).toHaveLength(1))

    let second: unknown
    await act(async () => {
      second = await result.current.upload(png('second.png'))
    })

    await expect(first).resolves.toBeNull()
    expect(second).toEqual(RESULT)
    expect(result.current).toMatchObject({ uploading: false, error: null, result: RESULT })
  })

  it('reset abandons an upload in flight and returns to idle', async () => {
    mock.onPost('/api/uploads/temp').reply(
      (config) =>
        new Promise((_done, fail) => {
          config.signal?.addEventListener?.('abort', () => fail(new Error('canceled')))
        }),
    )

    const { result } = renderHook(() => useTempUpload('dish'))
    let pending!: Promise<unknown>
    act(() => {
      pending = result.current.upload(png())
    })
    await waitFor(() => expect(result.current.uploading).toBe(true))
    await waitFor(() => expect(mock.history.post).toHaveLength(1))

    await act(async () => {
      result.current.reset()
      await expect(pending).resolves.toBeNull()
    })

    expect(result.current).toMatchObject({
      uploading: false,
      progress: null,
      error: null,
      result: null,
    })
  })
})
