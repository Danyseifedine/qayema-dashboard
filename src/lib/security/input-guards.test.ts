import { afterEach, describe, expect, it, vi } from 'vitest'
import { ACCEPTED_IMAGE_ACCEPT, MAX_IMAGE_BYTES, checkImageFile } from '@/lib/security/input-guards'

function fileOf(type: string, bytes = 1024): File {
  const file = new File(['x'], 'photo', { type })
  Object.defineProperty(file, 'size', { value: bytes })
  return file
}

/** Makes `createImageBitmap` report the given size, or fail. */
function stubBitmap(size: { width: number; height: number } | 'fail') {
  const close = vi.fn()
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(() =>
      size === 'fail'
        ? Promise.reject(new Error('undecodable'))
        : Promise.resolve({ ...size, close }),
    ),
  )
  return close
}

/** A fake `Image` that loads with the given size, or errors. */
function stubImage(size: { width: number; height: number } | 'error') {
  class FakeImage {
    naturalWidth = size === 'error' ? 0 : size.width
    naturalHeight = size === 'error' ? 0 : size.height
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(_value: string) {
      queueMicrotask(() => (size === 'error' ? this.onerror?.() : this.onload?.()))
    }
  }
  vi.stubGlobal('Image', FakeImage)
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
}

describe('checkImageFile', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('lists the accepted types for a file input', () => {
    expect(ACCEPTED_IMAGE_ACCEPT).toBe('image/jpeg,image/png,image/webp')
  })

  it('rejects a type the server would refuse', async () => {
    await expect(checkImageFile(fileOf('image/gif'))).resolves.toEqual({
      code: 'type',
      message: 'Images must be JPEG, PNG, or WebP.',
    })
    await expect(checkImageFile(fileOf('application/pdf'))).resolves.toMatchObject({
      code: 'type',
    })
  })

  it('rejects a file over 20 MB', async () => {
    await expect(checkImageFile(fileOf('image/png', MAX_IMAGE_BYTES + 1))).resolves.toEqual({
      code: 'size',
      message: 'Images must be 20 MB or smaller.',
    })
  })

  it('accepts a file exactly at the limit', async () => {
    const close = stubBitmap({ width: 4000, height: 3000 })

    await expect(checkImageFile(fileOf('image/jpeg', MAX_IMAGE_BYTES))).resolves.toBeNull()
    expect(close).toHaveBeenCalledOnce()
  })

  it('rejects an image wider or taller than 6000 pixels', async () => {
    stubBitmap({ width: 6001, height: 100 })
    await expect(checkImageFile(fileOf('image/webp'))).resolves.toEqual({
      code: 'dimensions',
      message: 'Images must be at most 6000 × 6000 pixels.',
    })

    stubBitmap({ width: 100, height: 6001 })
    await expect(checkImageFile(fileOf('image/webp'))).resolves.toMatchObject({
      code: 'dimensions',
    })
  })

  it('lets the server decide when the image cannot be decoded', async () => {
    stubBitmap('fail')
    await expect(checkImageFile(fileOf('image/png'))).resolves.toBeNull()
  })

  describe('without createImageBitmap', () => {
    it('reads the size through an Image and frees the object URL', async () => {
      vi.stubGlobal('createImageBitmap', undefined)
      stubImage({ width: 7000, height: 10 })
      const revoke = vi.spyOn(URL, 'revokeObjectURL')

      await expect(checkImageFile(fileOf('image/png'))).resolves.toMatchObject({
        code: 'dimensions',
      })
      expect(revoke).toHaveBeenCalledWith('blob:preview')
    })

    it('passes an image that fails to load', async () => {
      vi.stubGlobal('createImageBitmap', undefined)
      stubImage('error')

      await expect(checkImageFile(fileOf('image/png'))).resolves.toBeNull()
    })

    it('passes when neither decoder exists', async () => {
      vi.stubGlobal('createImageBitmap', undefined)
      vi.stubGlobal('Image', undefined)

      await expect(checkImageFile(fileOf('image/png'))).resolves.toBeNull()
    })

    it('passes when object URLs are unavailable', async () => {
      vi.stubGlobal('createImageBitmap', undefined)
      stubImage({ width: 10, height: 10 })
      vi.restoreAllMocks()
      const original = URL.createObjectURL
      // @ts-expect-error -- simulating an environment without object URLs
      URL.createObjectURL = undefined
      try {
        await expect(checkImageFile(fileOf('image/png'))).resolves.toBeNull()
      } finally {
        URL.createObjectURL = original
      }
    })
  })
})
