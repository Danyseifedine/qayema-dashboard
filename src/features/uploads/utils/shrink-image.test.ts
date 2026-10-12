import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_UPLOAD_EDGE,
  SMALL_IMAGE_BYTES,
  shrinkImage,
} from '@/features/uploads/utils/shrink-image'

const MB = 1024 * 1024

function photo(name: string, type: string, bytes: number): File {
  const file = new File(['x'], name, { type, lastModified: 1234 })
  Object.defineProperty(file, 'size', { value: bytes })
  return file
}

function blobOf(type: string, bytes = 1000): Blob {
  return new Blob([new Uint8Array(bytes)], { type })
}

/** jsdom has no decoder: this one reports the given size, or fails. */
function stubBitmap(width: number, height: number) {
  const close = vi.fn()
  const decode = vi.fn().mockResolvedValue({ width, height, close })
  vi.stubGlobal('createImageBitmap', decode)
  return { decode, close }
}

/**
 * jsdom has no OffscreenCanvas either. `encoded` answers each requested type,
 * which is how a browser that cannot encode WebP is played.
 */
function stubOffscreen(encoded: (type: string) => Blob = (type) => blobOf(type)) {
  const canvases: { width: number; height: number }[] = []
  const context = { drawImage: vi.fn(), imageSmoothingQuality: 'low' }
  const convertToBlob = vi.fn(({ type }: { type: string }) => Promise.resolve(encoded(type)))
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      constructor(width: number, height: number) {
        canvases.push({ width, height })
      }
      getContext() {
        return context
      }
      convertToBlob = convertToBlob
    },
  )
  return { canvases, context, convertToBlob }
}

describe('shrinkImage', () => {
  beforeEach(() => {
    // Each test opts into OffscreenCanvas; jsdom has none.
    vi.stubGlobal('OffscreenCanvas', undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('scales a large photo down to WebP, keeping its shape and name', async () => {
    const { close } = stubBitmap(4000, 3000)
    const { canvases, context, convertToBlob } = stubOffscreen()
    const original = photo('dish.photo.jpeg', 'image/jpeg', 5 * MB)

    const result = await shrinkImage(original)

    expect(canvases).toEqual([{ width: MAX_UPLOAD_EDGE, height: 1536 }])
    expect(context.imageSmoothingQuality).toBe('high')
    expect(context.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2048, 1536)
    expect(convertToBlob).toHaveBeenCalledWith({ type: 'image/webp', quality: 0.85 })
    expect(result).not.toBe(original)
    expect(result.name).toBe('dish.photo.webp')
    expect(result.type).toBe('image/webp')
    expect(result.size).toBe(1000)
    expect(result.lastModified).toBe(1234)
    expect(close).toHaveBeenCalledOnce()
  })

  it('caps the longest side of a portrait photo too', async () => {
    stubBitmap(3000, 6000)
    const { canvases } = stubOffscreen()

    await shrinkImage(photo('tall.png', 'image/png', 4 * MB))

    expect(canvases).toEqual([{ width: 1024, height: 2048 }])
  })

  it('decodes with the EXIF rotation so phone photos stay upright', async () => {
    const { decode } = stubBitmap(4000, 3000)
    stubOffscreen()
    const original = photo('phone.jpg', 'image/jpeg', 5 * MB)

    await shrinkImage(original)

    expect(decode).toHaveBeenCalledWith(original, { imageOrientation: 'from-image' })
  })

  it('never upscales: a heavy photo within the cap is only re-encoded', async () => {
    stubBitmap(1600, 1200)
    const { canvases } = stubOffscreen()

    const result = await shrinkImage(photo('heavy.webp', 'image/webp', 3 * MB))

    expect(canvases).toEqual([{ width: 1600, height: 1200 }])
    expect(result.name).toBe('heavy.webp')
  })

  it('names a file without an extension by its new type', async () => {
    stubBitmap(4000, 3000)
    stubOffscreen()

    const result = await shrinkImage(photo('camera', 'image/jpeg', 5 * MB))

    expect(result.name).toBe('camera.webp')
  })

  it('leaves a file that already fits and is light untouched', async () => {
    const { close } = stubBitmap(MAX_UPLOAD_EDGE, 1000)
    const { canvases } = stubOffscreen()
    const original = photo('small.jpg', 'image/jpeg', SMALL_IMAGE_BYTES - 1)

    await expect(shrinkImage(original)).resolves.toBe(original)
    expect(canvases).toHaveLength(0)
    expect(close).toHaveBeenCalledOnce()
  })

  it('falls back to JPEG where WebP cannot be encoded (Safari)', async () => {
    stubBitmap(4000, 3000)
    const { convertToBlob } = stubOffscreen((type) =>
      type === 'image/webp' ? blobOf('image/png', 2000) : blobOf(type),
    )

    const result = await shrinkImage(photo('IMG_0001.JPG', 'image/jpeg', 5 * MB))

    expect(convertToBlob).toHaveBeenLastCalledWith({ type: 'image/jpeg', quality: 0.85 })
    expect(result.name).toBe('IMG_0001.jpg')
    expect(result.type).toBe('image/jpeg')
  })

  it.each([
    ['logo.png', 'image/png'],
    ['logo.webp', 'image/webp'],
  ])(
    'sends a possibly transparent %s as it is where WebP cannot be encoded',
    async (name, type) => {
      stubBitmap(4000, 3000)
      const { convertToBlob } = stubOffscreen(() => blobOf('image/png'))
      const original = photo(name, type, 5 * MB)

      await expect(shrinkImage(original)).resolves.toBe(original)
      // Never flattened to JPEG, where the transparency would turn black.
      expect(convertToBlob).toHaveBeenCalledOnce()
    },
  )

  it('sends the original when the encoder gives back a type the server is not sent', async () => {
    stubBitmap(4000, 3000)
    stubOffscreen(() => blobOf('image/png'))
    const original = photo('odd.jpg', 'image/jpeg', 5 * MB)

    await expect(shrinkImage(original)).resolves.toBe(original)
  })

  it.each([
    ['menu.gif', 'image/gif'],
    ['logo.svg', 'image/svg+xml'],
    ['photo.heic', 'image/heic'],
  ])('sends %s as it is without decoding it', async (name, type) => {
    const { decode } = stubBitmap(4000, 3000)
    const original = photo(name, type, 5 * MB)

    await expect(shrinkImage(original)).resolves.toBe(original)
    expect(decode).not.toHaveBeenCalled()
  })

  it('sends the original when the image cannot be decoded', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('undecodable')))
    const original = photo('broken.jpg', 'image/jpeg', 5 * MB)

    await expect(shrinkImage(original)).resolves.toBe(original)
  })

  it('sends the original in a browser with no createImageBitmap', async () => {
    vi.stubGlobal('createImageBitmap', undefined)
    const original = photo('old.jpg', 'image/jpeg', 5 * MB)

    await expect(shrinkImage(original)).resolves.toBe(original)
  })

  it('sends the original when the result is not smaller', async () => {
    stubBitmap(1600, 1200)
    stubOffscreen((type) => blobOf(type, 2 * MB))
    const original = photo('tight.jpg', 'image/jpeg', 2 * MB)

    await expect(shrinkImage(original)).resolves.toBe(original)
  })

  describe('without OffscreenCanvas', () => {
    function stubCanvas(blob: Blob | null) {
      const context = { drawImage: vi.fn(), imageSmoothingQuality: 'low' }
      const getContext = vi
        .spyOn(HTMLCanvasElement.prototype, 'getContext')
        .mockReturnValue(context as never)
      const toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
        this: HTMLCanvasElement,
        done,
      ) {
        done(blob)
      })
      return { context, getContext, toBlob }
    }

    it('draws on a page canvas instead', async () => {
      stubBitmap(4000, 3000)
      const { context, toBlob } = stubCanvas(blobOf('image/webp'))

      const result = await shrinkImage(photo('dish.jpg', 'image/jpeg', 5 * MB))

      expect(context.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2048, 1536)
      const canvas = toBlob.mock.contexts[0] as HTMLCanvasElement
      expect([canvas.width, canvas.height]).toEqual([2048, 1536])
      expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.85)
      expect(result.type).toBe('image/webp')
    })

    it('sends the original when the canvas cannot encode', async () => {
      stubBitmap(4000, 3000)
      stubCanvas(null)
      const original = photo('dish.jpg', 'image/jpeg', 5 * MB)

      await expect(shrinkImage(original)).resolves.toBe(original)
    })

    it('sends the original when there is no 2D canvas, still freeing the bitmap', async () => {
      const { close } = stubBitmap(4000, 3000)
      const { getContext } = stubCanvas(blobOf('image/webp'))
      getContext.mockReturnValue(null)
      const original = photo('dish.jpg', 'image/jpeg', 5 * MB)

      await expect(shrinkImage(original)).resolves.toBe(original)
      expect(close).toHaveBeenCalledOnce()
    })
  })
})
