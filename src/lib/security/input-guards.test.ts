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

describe('checkImageFile', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('lists the accepted types for a file input', () => {
    expect(ACCEPTED_IMAGE_ACCEPT).toBe('image/jpeg,image/png,image/webp')
  })

  it('rejects a type the server would refuse', async () => {
    await expect(checkImageFile(fileOf('image/gif'))).resolves.toEqual({ code: 'type' })
    await expect(checkImageFile(fileOf('application/pdf'))).resolves.toMatchObject({
      code: 'type',
    })
  })

  it('rejects a file over 20 MB', async () => {
    await expect(checkImageFile(fileOf('image/png', MAX_IMAGE_BYTES + 1))).resolves.toEqual({
      code: 'size',
    })
  })

  it('accepts a file exactly at the limit', async () => {
    const close = stubBitmap({ width: 4000, height: 3000 })

    await expect(checkImageFile(fileOf('image/jpeg', MAX_IMAGE_BYTES))).resolves.toBeNull()
    expect(close).toHaveBeenCalledOnce()
  })

  it('rejects an image wider or taller than 6000 pixels', async () => {
    stubBitmap({ width: 6001, height: 100 })
    await expect(checkImageFile(fileOf('image/webp'))).resolves.toEqual({ code: 'dimensions' })

    stubBitmap({ width: 100, height: 6001 })
    await expect(checkImageFile(fileOf('image/webp'))).resolves.toMatchObject({
      code: 'dimensions',
    })
  })

  it('lets the server decide when the image cannot be decoded', async () => {
    stubBitmap('fail')
    await expect(checkImageFile(fileOf('image/png'))).resolves.toBeNull()
  })

  it('lets the server decide when the browser has no decoder', async () => {
    vi.stubGlobal('createImageBitmap', undefined)

    await expect(checkImageFile(fileOf('image/png'))).resolves.toBeNull()
  })
})
