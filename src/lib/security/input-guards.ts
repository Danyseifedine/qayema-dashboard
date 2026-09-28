/**
 * Client-side guards that mirror the server's rules.
 *
 * These exist so an owner learns about a bad file before a 20 MB upload
 * crosses the network, never as the security boundary. The real check is
 * ../qayema/app/Http/Requests/TempUploadRequest.php, which re-validates type,
 * size and pixel dimensions on every request.
 */

/** Matches `mimes:jpeg,jpg,png,webp` on the server. */
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/** The `accept` attribute for a file input, derived from the list above. */
export const ACCEPTED_IMAGE_ACCEPT = ACCEPTED_IMAGE_TYPES.join(',')

/**
 * `UploadLimits::APP_MAX_BYTES` in ../qayema: 20 MB, a phone photo straight off
 * the camera. The server turns every upload into a small WebP.
 */
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024

/** `dimensions:max_width=6000,max_height=6000`. */
export const MAX_IMAGE_EDGE = 6000

export type FileRejection = { code: 'type' | 'size' | 'dimensions' }

/**
 * Returns null when the file passes, or the reason it does not.
 *
 * Async because the pixel check has to decode the image header. The server
 * re-checks all three, so this only saves the owner a pointless round trip.
 */
export async function checkImageFile(file: File): Promise<FileRejection | null> {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) return { code: 'type' }

  if (file.size > MAX_IMAGE_BYTES) return { code: 'size' }

  const size = await readImageSize(file)
  if (size && (size.width > MAX_IMAGE_EDGE || size.height > MAX_IMAGE_EDGE)) {
    return { code: 'dimensions' }
  }

  return null
}

/**
 * Pixel dimensions, or null when they cannot be read. A failure here is not
 * a rejection: the server checks the same thing and is the authority.
 */
async function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    return null
  }
}
