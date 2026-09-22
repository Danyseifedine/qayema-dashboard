/**
 * Client-side guards that mirror the server's rules.
 *
 * These exist so an owner learns about a bad file before a 10 MB upload
 * crosses the network, never as the security boundary. The real check is
 * ../qayema/app/Http/Requests/TempUploadRequest.php, which re-validates type,
 * size and pixel dimensions on every request.
 */

/** Matches `mimes:jpeg,jpg,png,webp` on the server. */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/** The `accept` attribute for a file input, derived from the list above. */
export const ACCEPTED_IMAGE_ACCEPT = ACCEPTED_IMAGE_TYPES.join(',')

/** `max:10240` kilobytes. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

/** `dimensions:max_width=6000,max_height=6000`. */
export const MAX_IMAGE_EDGE = 6000

export type FileRejection = { code: 'type' | 'size' | 'dimensions'; message: string }

/**
 * Returns null when the file passes, or the reason it does not.
 *
 * Async because the pixel check has to decode the image header. The server
 * re-checks all three, so this only saves the owner a pointless round trip.
 */
export async function checkImageFile(file: File): Promise<FileRejection | null> {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return { code: 'type', message: 'Images must be JPEG, PNG, or WebP.' }
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return { code: 'size', message: 'Images must be 10 MB or smaller.' }
  }

  const size = await readImageSize(file)
  if (size && (size.width > MAX_IMAGE_EDGE || size.height > MAX_IMAGE_EDGE)) {
    return {
      code: 'dimensions',
      message: `Images must be at most ${MAX_IMAGE_EDGE} × ${MAX_IMAGE_EDGE} pixels.`,
    }
  }

  return null
}

/**
 * Pixel dimensions, or null when they cannot be read. A failure here is not
 * a rejection: the server checks the same thing and is the authority.
 */
async function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      const size = { width: bitmap.width, height: bitmap.height }
      bitmap.close()
      return size
    } catch {
      return null
    }
  }

  if (typeof Image !== 'function' || typeof URL.createObjectURL !== 'function') return null

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: image.naturalWidth, height: image.naturalHeight })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    image.src = url
  })
}
